// Simple test to verify blank template functionality
import { printifyProductService } from './src/services/printifyProductService.js';

async function testBlankTemplates() {
  try {
    console.log('Testing blank template fetching...');
    
    // Test getting blank templates from catalog
    const blankTemplates = await printifyProductService.getBlankShirtTemplates();
    
    console.log(`Found ${blankTemplates.length} blank templates:`);
    
    blankTemplates.slice(0, 3).forEach((template, index) => {
      console.log(`${index + 1}. ${template.label}`);
      console.log(`   Position: ${template.position}`);
      console.log(`   Color: ${template.variant?.color || 'Unknown'}`);
      console.log(`   Size: ${template.variant?.size || 'Unknown'}`);
      console.log(`   URL: ${template.src.substring(0, 50)}...`);
      console.log('');
    });
    
    // Test generating organized templates by color
    const colorTemplates = await printifyProductService.generateBlankTemplatesForColors(['White', 'Black']);
    
    console.log('Templates organized by color:');
    Object.entries(colorTemplates).forEach(([color, templates]) => {
      console.log(`${color}: ${templates.length} templates`);
    });
    
    console.log('✅ Blank template test successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBlankTemplates();