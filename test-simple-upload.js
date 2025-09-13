// Simple test using a public image URL
async function testImageUploadSimple() {
  console.log('🔍 Testing simple image upload...\n');

  try {
    // Use a simple public image
    const imageUrl = 'https://via.placeholder.com/300x300/FF6B6B/FFFFFF?text=TEST';
    
    // Fetch the image
    console.log('📥 Fetching image from:', imageUrl);
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();
    console.log('📷 Image blob size:', imageBlob.size, 'bytes');
    console.log('📷 Image type:', imageBlob.type);

    // Create FormData
    const formData = new FormData();
    formData.append('file', imageBlob, 'test-design.png');

    console.log('📤 Uploading to Printify...');
    
    // Upload via our proxy
    const uploadResponse = await fetch('/api/printify/v1/uploads/images.json', {
      method: 'POST',
      body: formData
    });

    console.log('📡 Upload response status:', uploadResponse.status);
    console.log('📡 Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

    if (uploadResponse.ok) {
      const data = await uploadResponse.json();
      console.log('✅ Upload successful!');
      console.log('📋 Response data:', data);
      return data;
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload failed with status:', uploadResponse.status);
      console.log('📋 Error response:', errorText);
      
      // Try to parse error as JSON
      try {
        const errorData = JSON.parse(errorText);
        console.log('📋 Parsed error:', errorData);
        
        if (errorData.errors) {
          console.log('📋 Specific errors:', errorData.errors);
        }
      } catch (e) {
        console.log('📋 Raw error text:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testImageUploadSimple();