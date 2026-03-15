# Set local git user.name and user.email to match global config
$globalName = git config --global user.name
$globalEmail = git config --global user.email

if ($globalName -and $globalEmail) {
    git config user.name $globalName
    git config user.email $globalEmail
    Write-Host "Local git user.name and user.email set to global values."
} else {
    Write-Host "Global git user.name or user.email not set. Please configure them first with:"
    Write-Host "git config --global user.name 'Your Name'"
    Write-Host "git config --global user.email 'your.email@example.com'"
}