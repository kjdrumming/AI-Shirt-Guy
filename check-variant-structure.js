// Check the detailed structure of Printify variants
async function checkVariantStructure() {
  const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6Ijc1MmZhNmNjYmY3MmZiZTE0YTVjN2ZlYWRiNmIyODYxNmVlMGM0MzEzZTU1NzVkNTk1Y2NmODFjNGFjMjZjZTI2YjM0NzE0ZjNmNTNiZDI1IiwiaWF0IjoxNzU3NzEyNzc2LjM1Njc2NCwibmJmIjoxNzU3NzEyNzc2LjM1Njc2NiwiZXhwIjoxNzg5MjQ4Nzc2LjM0OTgzNCwic3ViIjoiODM3ODUwNSIsInNjb3BlcyI6WyJzaG9wcy5tYW5hZ2UiLCJzaG9wcy5yZWFkIiwiY2F0YWxvZy5yZWFkIiwib3JkZXJzLnJlYWQiLCJvcmRlcnMud3JpdGUiLCJwcm9kdWN0cy5yZWFkIiwicHJvZHVjdHMud3JpdGUiLCJ3ZWJob29rcy5yZWFkIiwid2ViaG9va3Mud3JpdGUiLCJ1cGxvYWRzLnJlYWQiLCJ1cGxvYWRzLndyaXRlIiwicHJpbnRfcHJvdmlkZXJzLnJlYWQiLCJ1c2VyLmluZm8iXX0.EzA3EiHD_Vnhjxp84VmDBv4H-UddXU9WRXaceJKj9TdcgDtaLrZ0zys0XkJeIioeGgq6WZIBQqUEshstk_2_HajBuMYZHgBTBuopOTZOR-9n1QX0zMFradniLc9kmUEUGbGnzFrzH84w-mV5wL4JcOSj382IWhsd8B5_oreyX7nARmpUDN2zZLUQdU9aWKYYDMF9iSMgJV9wMSAJ2VWpEC7cAifVofor3Od3emjgcs2btYRxErfZiwmgSfYU1CNfwYOqbWdeg4V8uj7eVGkwOIKWVpoe2jEXnHgPZc0g2VNtppcmEQxG3IlYKxlz05juRxzb_Wk_oH9_3CrQ3EsrOidBImI-UE4c9fJb6BmzXJ9Dmf5Tqg04esarejVtdEgYS8ei5RzwK45peEwbBg-ySrF8FvDsqlwJbzLn5UZWNak1b5-zqsX_rAxbl1TDyJzb13rKVEtjs5Fdutlvgm92q54mZV2FmCA-7BAG6px_jrOc3MwG1zhDU8ITiYSXqF7z89elXvUoOD6rQZvaEDyPIYIcWrtWdkyWS5uA6kKkBV3pDYUTFBwXW5aVpY6kS-coHXku1Y3FDfF_yK-jps-_klvfwPCov-PeNm3EpziXcIh_6Dq_KZkclejLWYy2bNeRAblONAq-tNbBKmRVms1dK9nWl8Vsaz4gv8jtxawmizk';

  try {
    // Get variants for provider 103 (same as the app uses)
    const variantsResponse = await fetch('https://api.printify.com/v1/catalog/blueprints/6/print_providers/103/variants.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (variantsResponse.ok) {
      const data = await variantsResponse.json();
      console.log('📦 Variant structure for provider 103:');
      console.log('Total variants:', data.variants?.length || 0);
      
      if (data.variants && data.variants.length > 0) {
        // Show detailed structure of first few variants
        const sampleVariants = data.variants.slice(0, 5);
        
        sampleVariants.forEach((variant, index) => {
          console.log(`\n--- Variant ${index + 1} ---`);
          console.log('ID:', variant.id);
          console.log('Title:', variant.title);
          console.log('Price:', variant.price);
          console.log('Available:', variant.is_enabled);
          
          if (variant.options) {
            console.log('Options:');
            Object.keys(variant.options).forEach(key => {
              console.log(`  ${key}:`, variant.options[key]);
            });
          }
          
          if (variant.placeholders) {
            console.log('Placeholders:', variant.placeholders.length);
          }
        });
        
        // Get unique colors
        const colors = [...new Set(data.variants.map(v => v.options?.color).filter(Boolean))];
        console.log('\n🎨 Available colors:', colors);
        
        // Get unique sizes  
        const sizes = [...new Set(data.variants.map(v => v.options?.size).filter(Boolean))];
        console.log('📏 Available sizes:', sizes);
      }
    } else {
      console.log('❌ Failed to fetch variants:', variantsResponse.status);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVariantStructure();