# Draws the README cover (assets/cover.png, 1600x1000), the icon (assets/icon.png, 256x256, which
# Orca shows as the project's icon) and the GitHub social preview (assets/social-preview.png,
# 1280x640, uploaded by hand in Settings), all dark and from shapes.
# Run from the repository root: powershell -NoProfile -File assets/draw-images.ps1
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

function New-Canvas([int]$w, [int]$h) {
  $bitmap = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  return @($bitmap, $g)
}

# The icon: the accent's gradient square with the repo's symbol, drawn where the cover puts it
# (120,250, 120 px). $glyph draws the symbol in those coordinates.
function Draw-Icon($g, $cover, [scriptblock]$glyph) {
  Fill-Gradient $g (Get-Color $cover.Accent) (Get-Color $cover.AccentDark) 120 250 120 120 26
  & $glyph $g
}

# The cover, 1600 px wide plus $extra on each side: the ground and the glow fill it all, the
# content stays in the middle 1600x1000.
function Draw-Cover($g, $cover, [int]$extra) {
  $width = 1600 + 2 * $extra
  $g.Clear($ground)
  $glow = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $width, 1000), (Get-Color $cover.Accent 70), (Get-Color $cover.Accent 0))
  $g.FillRectangle($glow, 0, 0, $width, 1000)
  $glow.Dispose()
  $g.TranslateTransform($extra, 0)
  Draw-Icon $g $cover $cover.Glyph
  Write-Text $g $cover.Title 'Segoe UI Semibold' 60 (Get-Color '#ECEFF4') 112 400
  for ($i = 0; $i -lt $cover.Text.Count; $i++) {
    Write-Text $g $cover.Text[$i] 'Segoe UI' 28 (Get-Color '#A0A8B6') 120 (520 + $i * 46)
  }
  Fill-Rounded $g $frame 900 90 580 820 28
  for ($i = 0; $i -lt 3; $i++) { Fill-Rounded $g $line (936 + $i * 40) 122 22 22 11 }
  & $cover.Picture $g
  $g.ResetTransform()
}

function Save-Images($cover) {
  $canvas = New-Canvas 1600 1000
  Draw-Cover $canvas[1] $cover 0
  $canvas[1].Dispose()
  $canvas[0].Save((Join-Path $assets 'cover.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas[0].Dispose()

  # GitHub's preview is 2:1: the cover widened to 2000x1000, then scaled to 1280x640.
  $wide = New-Canvas 2000 1000
  Draw-Cover $wide[1] $cover 200
  $wide[1].Dispose()
  $social = New-Canvas 1280 640
  $social[1].DrawImage($wide[0], 0, 0, 1280, 640)
  $social[1].Dispose(); $wide[0].Dispose()
  $social[0].Save((Join-Path $assets 'social-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $social[0].Dispose()

  # The icon, the cover's 120 px square drawn at 240 px on a transparent 256x256.
  $icon = New-Canvas 256 256
  $icon[1].Clear([System.Drawing.Color]::Transparent)
  $icon[1].Transform = New-Object System.Drawing.Drawing2D.Matrix(2, 0, 0, 2, -232, -492)
  Draw-Icon $icon[1] $cover $cover.Glyph
  $icon[1].Dispose()
  $icon[0].Save((Join-Path $assets 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $icon[0].Dispose()

  Write-Output 'cover.png, icon.png and social-preview.png written'
}

$cover = @{
  Accent = '#1F6FEB'
  AccentDark = '#0B3D91'
  Title = 'Dashboards'
  Text = @('Home data, drawn in the browser:', 'what groceries cost at each store', 'and how the prices change.')
}

$cover.Glyph = {
  param($g)
  # The icon: three bars.
  $icon = @(0.45, 0.8, 0.6)
  for ($i = 0; $i -lt $icon.Count; $i++) {
    $h = 70 * $icon[$i]
    Fill-Rounded $g (Get-Color '#ECEFF4') (148 + $i * 24) (340 - $h) 16 $h 4
  }
}

$cover.Picture = {
  param($g)
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
}

Save-Images $cover
