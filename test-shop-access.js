// Test shop access and permissions
async function testShopAccess() {
  const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6Ijc1MmZhNmNjYmY3MmZiZTE0YTVjN2ZlYWRiNmIyODYxNmVlMGM0MzEzZTU1NzVkNTk1Y2NmODFjNGFjMjZjZTI2YjM0NzE0ZjNmNTNiZDI1IiwiaWF0IjoxNzU3NzEyNzc2LjM1Njc2NCwibmJmIjoxNzU3NzEyNzc2LjM1Njc2NiwiZXhwIjoxNzg5MjQ4Nzc2LjM0OTgzNCwic3ViIjoiODM3ODUwNSIsInNjb3BlcyI6WyJzaG9wcy5tYW5hZ2UiLCJzaG9wcy5yZWFkIiwiY2F0YWxvZy5yZWFkIiwib3JkZXJzLnJlYWQiLCJvcmRlcnMud3JpdGUiLCJwcm9kdWN0cy5yZWFkIiwicHJvZHVjdHMud3JpdGUiLCJ3ZWJob29rcy5yZWFkIiwid2ViaG9va3Mud3JpdGUiLCJ1cGxvYWRzLnJlYWQiLCJ1cGxvYWRzLndyaXRlIiwicHJpbnRfcHJvdmlkZXJzLnJlYWQiLCJ1c2VyLmluZm8iXX0.EzA3EiHD_Vnhjxp84VmDBv4H-UddXU9WRXaceJKj9TdcgDtaLrZ0zys0XkJeIioeGgq6WZIBQqUEshstk_2_HajBuMYZHgBTBuopOTZOR-9n1QX0zMFradniLc9kmUEUGbGnzFrzH84w-mV5wL4JcOSj382IWhsd8B5_oreyX7nARmpUDN2zZLUQdU9aWKYYDMF9iSMgJV9wMSAJ2VWpEC7cAifVofor3Od3emjgcs2btYRxErfZiwmgSfYU1CNfwYOqbWdeg4V8uj7eVGkwOIKWVpoe2jEXnHgPZc0g2VNtppcmEQxG3IlYKxlz05juRxzb_Wk_oH9_3CrQ3EsrOidBImI-UE4c9fJb6BmzXJ9Dmf5Tqg04esarejVtdEgYS8ei5RzwK45peEwbBg-ySrF8FvDsqlwJbzLn5UZWNak1b5-zqsX_rAxbl1TDyJzb13rKVEtjs5Fdutlvgm92q54mZV2FmCA-7BAG6px_jrOc3MwG1zhDU8ITiYSXqF7z89elXvUoOD6rQZvaEDyPIYIcWrtWdkyWS5uA6kKkBV3pDYUTFBwXW5aVpY6kS-coHXku1Y3FDfF_yK-jps-_klvfwPCov-PeNm3EpziXcIh_6Dq_KZkclejLWYy2bNeRAblONAq-tNbBKmRVms1dK9nWl8Vsaz4gv8jtxawmizk';

  console.log('🔍 Testing shop access and permissions...\n');

  try {
    // Test 1: Get user info to verify token
    console.log('👤 Testing user info...');
    const userResponse = await fetch('https://api.printify.com/v1/user.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User info:', userData);
    } else {
      console.log('❌ User info failed:', userResponse.status);
    }

    // Test 2: Get shops list
    console.log('\n🏪 Testing shops list...');
    const shopsResponse = await fetch('https://api.printify.com/v1/shops.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (shopsResponse.ok) {
      const shops = await shopsResponse.json();
      console.log('✅ Available shops:', shops);
      
      // Check if our shop ID is in the list
      const ourShop = shops.find(shop => shop.id === 8378505 || shop.id === '8378505');
      if (ourShop) {
        console.log('✅ Found our shop:', ourShop);
      } else {
        console.log('❌ Our shop ID 8378505 not found in available shops');
      }
    } else {
      console.log('❌ Shops list failed:', shopsResponse.status);
    }

    // Test 3: Try to access our specific shop
    console.log('\n🏪 Testing specific shop access...');
    const shopResponse = await fetch('https://api.printify.com/v1/shops/8378505.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (shopResponse.ok) {
      const shopData = await shopResponse.json();
      console.log('✅ Shop data:', shopData);
    } else {
      console.log('❌ Shop access failed:', shopResponse.status);
      const errorText = await shopResponse.text();
      console.log('📋 Error details:', errorText);
    }

    // Test 4: Try to get existing products from the shop
    console.log('\n📦 Testing products access...');
    const productsResponse = await fetch('https://api.printify.com/v1/shops/8378505/products.json', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (productsResponse.ok) {
      const products = await productsResponse.json();
      console.log('✅ Products access successful:', products.data?.length || 0, 'products');
    } else {
      console.log('❌ Products access failed:', productsResponse.status);
      const errorText = await productsResponse.text();
      console.log('📋 Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing shop access:', error);
  }
}

testShopAccess();