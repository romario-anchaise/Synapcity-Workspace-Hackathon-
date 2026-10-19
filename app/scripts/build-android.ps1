param(
    [string]$Sdk = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$Jdk = 'C:\Program Files\Android\Android Studio\jbr'
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$androidRoot = Join-Path $projectRoot 'android'
$buildRoot = Join-Path $androidRoot 'build'
$toolRoot = Join-Path $Sdk 'build-tools\36.1.0'
$androidJar = Join-Path $Sdk 'platforms\android-36\android.jar'
$java = Join-Path $Jdk 'bin\java.exe'
$javac = Join-Path $Jdk 'bin\javac.exe'
$jar = Join-Path $Jdk 'bin\jar.exe'
foreach ($required in @($java,$javac,$jar,$androidJar,(Join-Path $toolRoot 'aapt2.exe'))) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Falta la herramienta: $required" }
}
function Run-Tool([string]$binary, [string[]]$arguments) {
    & $binary @arguments
    if ($LASTEXITCODE -ne 0) { throw "Falló la herramienta $binary (código $LASTEXITCODE)" }
}
foreach ($folder in @('classes','dex','output')) { New-Item -ItemType Directory -Path (Join-Path $buildRoot $folder) -Force | Out-Null }
$resources = Join-Path $buildRoot 'resources.zip'
$unsigned = Join-Path $buildRoot 'unsigned.apk'
$aligned = Join-Path $buildRoot 'aligned.apk'
$output = Join-Path $buildRoot 'output\Rapicostura.apk'
Run-Tool (Join-Path $toolRoot 'aapt2.exe') @('compile','--dir',(Join-Path $androidRoot 'res'),'-o',$resources)
Run-Tool (Join-Path $toolRoot 'aapt2.exe') @('link','-o',$unsigned,'-I',$androidJar,'--manifest',(Join-Path $androidRoot 'AndroidManifest.xml'),$resources)
$sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $androidRoot 'src') -Recurse -Filter '*.java' | ForEach-Object { $_.FullName })
Run-Tool $javac (@('--release','8','-encoding','UTF-8','-classpath',$androidJar,'-d',(Join-Path $buildRoot 'classes')) + $sourceFiles)
$classes = Join-Path $buildRoot 'classes.jar'
Run-Tool $jar @('--create','--file',$classes,'-C',(Join-Path $buildRoot 'classes'),'.')
Run-Tool $java @('-cp',(Join-Path $toolRoot 'lib\d8.jar'),'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',(Join-Path $buildRoot 'dex'),$classes)
Run-Tool $jar @('uf',$unsigned,'-C',(Join-Path $buildRoot 'dex'),'classes.dex')
Run-Tool (Join-Path $toolRoot 'zipalign.exe') @('-f','4',$unsigned,$aligned)

# Mantener esta clave para que futuras versiones nativas se instalen como actualización.
$signing = Join-Path $androidRoot 'signing'
New-Item -ItemType Directory -Path $signing -Force | Out-Null
$secretPath = Join-Path $signing 'password.txt'
$keystore = Join-Path $signing 'rapicostura.jks'
if (-not (Test-Path -LiteralPath $secretPath)) {
    if (Test-Path -LiteralPath $keystore) { throw 'Existe la clave de firma pero falta su contraseña. Recuperar la contraseña original.' }
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    [System.IO.File]::WriteAllText($secretPath,[Convert]::ToBase64String($bytes))
    $rng.Dispose()
}
$env:RAPICOSTURA_STORE_PASSWORD = [System.IO.File]::ReadAllText($secretPath).Trim()
try {
    if (-not (Test-Path -LiteralPath $keystore)) {
        Run-Tool (Join-Path $Jdk 'bin\keytool.exe') @('-genkeypair','-keystore',$keystore,'-storetype','JKS','-alias','rapicostura','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Rapicostura, O=Rapicostura, C=PE','-storepass:env','RAPICOSTURA_STORE_PASSWORD','-keypass:env','RAPICOSTURA_STORE_PASSWORD')
    }
    $signer = Join-Path $toolRoot 'lib\apksigner.jar'
    Run-Tool $java @('-jar',$signer,'sign','--ks',$keystore,'--ks-key-alias','rapicostura','--ks-pass','env:RAPICOSTURA_STORE_PASSWORD','--key-pass','env:RAPICOSTURA_STORE_PASSWORD','--out',$output,$aligned)
    Run-Tool $java @('-jar',$signer,'verify','--verbose',$output)
    Run-Tool (Join-Path $toolRoot 'zipalign.exe') @('-c','4',$output)
} finally { Remove-Item Env:\RAPICOSTURA_STORE_PASSWORD -ErrorAction SilentlyContinue }
Copy-Item -LiteralPath $output -Destination (Join-Path (Split-Path $projectRoot) 'Rapicostura.apk') -Force
Write-Output "APK creada y verificada: $output"
Get-FileHash -LiteralPath $output -Algorithm SHA256 | Select-Object Hash,Path
