import fs from 'fs';
import path from 'path';

// PWA Verification Suite for Depend Sourcing Ltd.
function runTests() {
  console.log('--- DEPEND SOURCING LTD. PWA VERIFICATION SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  const rootDir = process.cwd();

  // Test 1: Check manifest.webmanifest
  const webmanifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
  assert(fs.existsSync(webmanifestPath), 'manifest.webmanifest exists');
  
  if (fs.existsSync(webmanifestPath)) {
    const raw = fs.readFileSync(webmanifestPath, 'utf8');
    let manifest: any = null;
    try {
      manifest = JSON.parse(raw);
      assert(true, 'manifest.webmanifest is valid JSON');
    } catch (e: any) {
      assert(false, 'manifest.webmanifest is valid JSON', e.message);
    }

    if (manifest) {
      assert(manifest.name === 'Depend Sourcing Ltd.', 'Manifest name matches "Depend Sourcing Ltd."');
      assert(manifest.short_name === 'Depend Sourcing', 'Manifest short_name matches "Depend Sourcing"');
      assert(manifest.display === 'standalone', 'Manifest display is "standalone"');
      assert(manifest.orientation === 'portrait', 'Manifest orientation is "portrait"');
      assert(manifest.start_url === '/', 'Manifest start_url is "/"');
      assert(manifest.scope === '/', 'Manifest scope is "/"');
      assert(manifest.theme_color?.toLowerCase() === '#0b192c', 'Manifest theme_color is #0b192c');
      assert(manifest.background_color?.toLowerCase() === '#0b192c', 'Manifest background_color is #0b192c');
      
      const icons: any[] = manifest.icons || [];
      const has192Any = icons.some(i => i.sizes === '192x192' && (i.purpose === 'any' || !i.purpose));
      const has512Any = icons.some(i => i.sizes === '512x512' && (i.purpose === 'any' || !i.purpose));
      const has192Maskable = icons.some(i => i.sizes === '192x192' && i.purpose === 'maskable');
      const has512Maskable = icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable');

      assert(has192Any, 'Manifest has 192x192 any purpose icon');
      assert(has512Any, 'Manifest has 512x512 any purpose icon');
      assert(has192Maskable, 'Manifest has 192x192 maskable icon with safe zone');
      assert(has512Maskable, 'Manifest has 512x512 maskable icon with safe zone');
    }
  }

  // Test 2: Check manifest.json alias
  const jsonManifestPath = path.join(rootDir, 'public', 'manifest.json');
  assert(fs.existsSync(jsonManifestPath), 'public/manifest.json fallback exists');

  // Test 3: Validate PNG file signatures and dimensions
  const pngAssets = [
    { file: 'pwa-192x192.png', width: 192, height: 192 },
    { file: 'pwa-512x512.png', width: 512, height: 512 },
    { file: 'pwa-maskable-192x192.png', width: 192, height: 192 },
    { file: 'pwa-maskable-512x512.png', width: 512, height: 512 },
    { file: 'apple-touch-icon.png', width: 180, height: 180 },
    { file: 'favicon.png', width: 64, height: 64 }
  ];

  for (const asset of pngAssets) {
    const filePath = path.join(rootDir, 'public', asset.file);
    assert(fs.existsSync(filePath), `Asset ${asset.file} exists`);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      // PNG Signature check: 89 50 4E 47 0D 0A 1A 0A
      const isPng =
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a;
      assert(isPng, `Asset ${asset.file} is a valid binary PNG file`);

      // Read IHDR width and height (at offset 16 and 20, big-endian 32-bit uint)
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      assert(w === asset.width && h === asset.height, `Asset ${asset.file} dimensions match ${asset.width}x${asset.height} (got ${w}x${h})`);
    }
  }

  // Test 4: Check SVG and Favicon
  assert(fs.existsSync(path.join(rootDir, 'public', 'icon.svg')), 'public/icon.svg exists');
  assert(fs.existsSync(path.join(rootDir, 'public', 'icon-maskable.svg')), 'public/icon-maskable.svg exists');
  assert(fs.existsSync(path.join(rootDir, 'public', 'favicon.ico')), 'public/favicon.ico exists');

  // Test 5: Check index.html PWA tags
  const indexPath = path.join(rootDir, 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert(indexHtml.includes('rel="manifest"'), 'index.html links to manifest');
  assert(indexHtml.includes('name="theme-color" content="#0b192c"'), 'index.html sets theme-color to #0b192c');
  assert(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html has apple-mobile-web-app-capable');
  assert(indexHtml.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), 'index.html has apple-mobile-web-app-status-bar-style');
  assert(indexHtml.includes('rel="apple-touch-icon"'), 'index.html links to apple-touch-icon');
  assert(indexHtml.includes('viewport-fit=cover'), 'index.html viewport specifies viewport-fit=cover');

  // Test 6: Check Components
  assert(fs.existsSync(path.join(rootDir, 'components', 'PWAInstallButton.tsx')), 'components/PWAInstallButton.tsx exists');
  assert(fs.existsSync(path.join(rootDir, 'components', 'PWAUpdatePrompt.tsx')), 'components/PWAUpdatePrompt.tsx exists');

  console.log(`\n================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
