param([switch]$DebugBuild, [switch]$UseGoogleMavenMirror)

$ErrorActionPreference = 'Stop'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $projectDirectory
try {
    if (-not (Get-Command java -ErrorAction SilentlyContinue) -and -not $env:JAVA_HOME) {
        throw 'Install JDK 17 or newer and set JAVA_HOME before building.'
    }

    $localProperties = Join-Path $projectDirectory 'local.properties'
    if (-not (Test-Path -LiteralPath $localProperties)) {
        $sdkCandidates = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT)
        if ($env:LOCALAPPDATA) { $sdkCandidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk') }
        $sdkDirectory = $sdkCandidates | Where-Object {
            $_ -and (Test-Path -LiteralPath (Join-Path $_ 'platforms\android-35'))
        } | Select-Object -First 1
        if (-not $sdkDirectory) {
            throw 'Install Android SDK Platform 35 in Android Studio, then set ANDROID_HOME to your SDK directory.'
        }
        $sdkDirectory = [IO.Path]::GetFullPath($sdkDirectory).Replace('\', '/').Replace(':', '\:')
        [IO.File]::WriteAllText($localProperties, "sdk.dir=$sdkDirectory`n")
    }

    $outputDirectory = Join-Path $projectDirectory 'output'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $gradleOptions = @('--console=plain')
    if ($UseGoogleMavenMirror) {
        $gradleOptions += '-PrimaGoogleMavenRepository=https://maven.aliyun.com/repository/google'
        Write-Output 'Using the Aliyun mirror for Google Maven dependencies.'
    }
    $repositoryUri = [uri]'https://dl.google.com'
    $proxyUri = [Net.WebRequest]::GetSystemWebProxy().GetProxy($repositoryUri)
    if ($proxyUri -and $proxyUri.Host -ne $repositoryUri.Host -and $proxyUri.Scheme -in @('http', 'https')) {
        $gradleOptions += @(
            "-Dhttp.proxyHost=$($proxyUri.Host)", "-Dhttp.proxyPort=$($proxyUri.Port)",
            "-Dhttps.proxyHost=$($proxyUri.Host)", "-Dhttps.proxyPort=$($proxyUri.Port)"
        )
        Write-Output "Using Windows system proxy $($proxyUri.Host):$($proxyUri.Port) for Gradle downloads."
    }
    if ($DebugBuild) {
        & .\gradlew.bat @gradleOptions :app:assembleDebug :app:lintDebug
        if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE." }
        Copy-Item -LiteralPath 'app\build\outputs\apk\debug\app-debug.apk' -Destination (Join-Path $outputDirectory 'rima-debug.apk')
        Write-Output "Built $outputDirectory\rima-debug.apk"
    } else {
        & node 'scripts\setup-signing.cjs'
        if ($LASTEXITCODE -ne 0) { throw 'Release signing setup failed.' }
        & .\gradlew.bat @gradleOptions :app:assembleRelease :app:bundleRelease :app:lintRelease
        if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE." }
        Copy-Item -LiteralPath 'app\build\outputs\apk\release\app-release.apk' -Destination (Join-Path $outputDirectory 'rima-release.apk')
        Copy-Item -LiteralPath 'app\build\outputs\bundle\release\app-release.aab' -Destination (Join-Path $outputDirectory 'rima-release.aab')
        Write-Output "Built $outputDirectory\rima-release.apk and rima-release.aab"
    }
} finally {
    Pop-Location
}
