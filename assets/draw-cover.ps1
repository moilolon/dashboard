# Draws the README cover (1600x1000, dark) into assets/cover.png, from shapes.
# Run from the repository root: powershell -NoProfile -File assets/draw-cover.ps1
Add-Type -AssemblyName System.Drawing

$assets = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-Color([string]$hex, [int]$alpha = 255) {
  $c = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B)
}

$ground = Get-Color '#1E222A'
$frame = Get-Color '#181B22'
$sheet = Get-Color '#2C313C'
$line = Get-Color '#565E6E'

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-Rounded($g, $color, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $brush = New-Object System.Drawing.SolidBrush $color
  $path = New-RoundedPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  $brush.Dispose(); $path.Dispose()
}

function Fill-Gradient($g, $from, $to, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.PointF $x, $y), (New-Object System.Drawing.PointF ($x + $w), ($y + $h)), $from, $to)
  $path = New-RoundedPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  $brush.Dispose(); $path.Dispose()
}

function Write-Text($g, [string]$text, [string]$font, [float]$size, $color, [float]$x, [float]$y) {
  $f = New-Object System.Drawing.Font($font, $size)
  $b = New-Object System.Drawing.SolidBrush $color
  $g.DrawString($text, $f, $b, $x, $y)
  $f.Dispose(); $b.Dispose()
}

function Draw-Lines($g, [float]$x, [float]$y, [float]$w, [float[]]$fractions, [float]$gap) {
  foreach ($fraction in $fractions) {
    Fill-Rounded $g $line $x $y ($w * $fraction) 8 4
    $y += $gap
  }
}

# The common cover: dark ground with the accent's glow, the icon, the name and three lines on
# the left; the window on the right, where each repo draws its own picture.
function New-Cover([string]$accent, [string]$accentDark, [string]$title, [string[]]$text) {
  $bitmap = New-Object System.Drawing.Bitmap 1600, 1000
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($ground)
  $glow = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 1600, 1000), (Get-Color $accent 70), (Get-Color $accent 0))
  $g.FillRectangle($glow, 0, 0, 1600, 1000)
  $glow.Dispose()
  Fill-Gradient $g (Get-Color $accent) (Get-Color $accentDark) 120 250 120 120 26
  Write-Text $g $title 'Segoe UI Semibold' 60 (Get-Color '#ECEFF4') 112 400
  for ($i = 0; $i -lt $text.Count; $i++) {
    Write-Text $g $text[$i] 'Segoe UI' 28 (Get-Color '#A0A8B6') 120 (520 + $i * 46)
  }
  Fill-Rounded $g $frame 900 90 580 820 28
  for ($i = 0; $i -lt 3; $i++) { Fill-Rounded $g $line (936 + $i * 40) 122 22 22 11 }
  return @($bitmap, $g)
}

function Save-Cover($canvas) {
  $canvas[1].Dispose()
  $canvas[0].Save((Join-Path $assets 'cover.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas[0].Dispose()
  Write-Output 'cover.png written'
}

$canvas = New-Cover '#1F6FEB' '#0B3D91' 'Dashboards' @('Home data, drawn in the browser:', 'what groceries cost at each store', 'and how the prices change.')
$g = $canvas[1]

# The icon: three bars.
$icon = @(0.45, 0.8, 0.6)
for ($i = 0; $i -lt $icon.Count; $i++) {
  $h = 70 * $icon[$i]
  Fill-Rounded $g (Get-Color '#ECEFF4') (148 + $i * 24) (340 - $h) 16 $h 4
}

# The dashboard: figure tiles, a price chart with a line per store, and the basket bars.
$stores = @('#7AA2F7', '#78C88C', '#E6B95A', '#EB6E6E')
for ($i = 0; $i -lt 3; $i++) {
  Fill-Rounded $g $sheet (930 + $i * 178) 176 162 110 14
  Fill-Rounded $g (Get-Color $stores[$i]) (950 + $i * 178) 200 70 12 6
  Fill-Rounded $g (Get-Color '#ECEFF4') (950 + $i * 178) 232 110 26 8
}
Fill-Rounded $g $sheet 930 306 520 330 16
$series = @(
  @(520, 520, 470, 470, 490, 430, 430, 400),
  @(560, 540, 540, 510, 510, 520, 480, 480),
  @(450, 450, 460, 420, 420, 410, 390, 360),
  @(590, 580, 580, 560, 540, 540, 530, 500)
)
for ($s = 0; $s -lt $series.Count; $s++) {
  $pen = New-Object System.Drawing.Pen((Get-Color $stores[$s]), 5)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $points = New-Object System.Collections.Generic.List[System.Drawing.PointF]
  for ($i = 0; $i -lt $series[$s].Count; $i++) {
    $x = 960 + $i * 64
    if ($i -gt 0) { $points.Add((New-Object System.Drawing.PointF $x, $series[$s][$i - 1])) }
    $points.Add((New-Object System.Drawing.PointF $x, $series[$s][$i]))
  }
  $g.DrawLines($pen, $points.ToArray())
  $pen.Dispose()
}
Fill-Rounded $g $sheet 930 656 520 220 16
$basket = @(0.55, 0.75, 0.4, 0.9, 0.6, 0.7, 0.5)
for ($i = 0; $i -lt $basket.Count; $i++) {
  $h = 150 * $basket[$i]
  Fill-Rounded $g (Get-Color $stores[$i % 4]) (962 + $i * 68) (850 - $h) 40 $h 8
}

Save-Cover $canvas
