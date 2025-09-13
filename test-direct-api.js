// Direct test of the Printify API call that's failing
async function testDirectAPI() {
  const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6Ijc1MmZhNmNjYmY3MmZiZTE0YTVjN2ZlYWRiNmIyODYxNmVlMGM0MzEzZTU1NzVkNTk1Y2NmODFjNGFjMjZjZTI2YjM0NzE0ZjNmNTNiZDI1IiwiaWF0IjoxNzU3NzEyNzc2LjM1Njc2NCwibmJmIjoxNzU3NzEyNzc2LjM1Njc2NiwiZXhwIjoxNzg5MjQ4Nzc2LjM0OTgzNCwic3ViIjoiODM3ODUwNSIsInNjb3BlcyI6WyJzaG9wcy5tYW5hZ2UiLCJzaG9wcy5yZWFkIiwiY2F0YWxvZy5yZWFkIiwib3JkZXJzLnJlYWQiLCJvcmRlcnMud3JpdGUiLCJwcm9kdWN0cy5yZWFkIiwicHJvZHVjdHMud3JpdGUiLCJ3ZWJob29rcy5yZWFkIiwid2ViaG9va3Mud3JpdGUiLCJ1cGxvYWRzLnJlYWQiLCJ1cGxvYWRzLndyaXRlIiwicHJpbnRfcHJvdmlkZXJzLnJlYWQiLCJ1c2VyLmluZm8iXX0.EzA3EiHD_Vnhjxp84VmDBv4H-UddXU9WRXaceJKj9TdcgDtaLrZ0zys0XkJeIioeGgq6WZIBQqUEshstk_2_HajBuMYZHgBTBuopOTZOR-9n1QX0zMFradniLc9kmUEUGbGnzFrzH84w-mV5wL4JcOSj382IWhsd8B5_oreyX7nARmpUDN2zZLUQdU9aWKYYDMF9iSMgJV9wMSAJ2VWpEC7cAifVofor3Od3emjgcs2btYRxErfZiwmgSfYU1CNfwYOqbWdeg4V8uj7eVGkwOIKWVpoe2jEXnHgPZc0g2VNtppcmEQxG3IlYKxlz05juRxzb_Wk_oH9_3CrQ3EsrOidBImI-UE4c9fJb6BmzXJ9Dmf5Tqg04esarejVtdEgYS8ei5RzwK45peEwbBg-ySrF8FvDsqlwJbzLn5UZWNak1b5-zqsX_rAxbl1TDyJzb13rKVEtjs5Fdutlvgm92q54mZV2FmCA-7BAG6px_jrOc3MwG1zhDU8ITiYSXqF7z89elXvUoOD6rQZvaEDyPIYIcWrtWdkyWS5uA6kKkBV3pDYUTFBwXW5aVpY6kS-coHXku1Y3FDfF_yK-jps-_klvfwPCov-PeNm3EpziXcIh_6Dq_KZkclejLWYy2bNeRAblONAq-tNbBKmRVms1dK9nWl8Vsaz4gv8jtxawmizk';

  console.log('🔍 Testing direct Printify API calls...\n');

  try {
    // Test 1: Get blueprint
    console.log('📋 Testing blueprint 6...');
    const blueprintResponse = await fetch('https://api.printify.com/v1/catalog/blueprints/6.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Blueprint response:', blueprintResponse.status);
    if (blueprintResponse.ok) {
      const blueprint = await blueprintResponse.json();
      console.log('✅ Blueprint:', blueprint.title);
    } else {
      const error = await blueprintResponse.text();
      console.log('❌ Blueprint error:', error);
      return;
    }

    // Test 2: Get print providers
    console.log('\n🏭 Testing print providers for blueprint 6...');
    const providersResponse = await fetch('https://api.printify.com/v1/catalog/blueprints/6/print_providers.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Providers response:', providersResponse.status);
    if (providersResponse.ok) {
      const providers = await providersResponse.json();
      console.log('✅ Found providers:', providers.length);
      
      // Check each provider for variants
      for (const provider of providers.slice(0, 5)) { // Test first 5 providers
        console.log(`\n🔍 Testing provider ${provider.id}: ${provider.title}`);
        
        try {
          const variantsResponse = await fetch(`https://api.printify.com/v1/catalog/blueprints/6/print_providers/${provider.id}/variants.json`, {
            headers: {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (variantsResponse.ok) {
            const variants = await variantsResponse.json();
            console.log(`✅ Provider ${provider.id} has ${variants.variants?.length || 0} variants`);
            
            if (variants.variants && variants.variants.length > 0) {
              console.log('📦 Sample variants:');
              variants.variants.slice(0, 3).forEach(variant => {
                console.log(`   - ${variant.title} ($${(variant.price / 100).toFixed(2)})`);
              });
            }
          } else {
            console.log(`❌ Provider ${provider.id} variants failed: ${variantsResponse.status}`);
          }
        } catch (error) {
          console.log(`❌ Provider ${provider.id} error:`, error.message);
        }
      }
      
    } else {
      const error = await providersResponse.text();
      console.log('❌ Providers error:', error);
    }

  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

testDirectAPI();