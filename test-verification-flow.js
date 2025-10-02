// Test script to verify the VerificationFlowManager functionality
const { VerificationFlowManager } = require('./src/lib/verification/verification-flow-manager');

console.log('🧪 Testing VerificationFlowManager...\n');

// Test 1: Check step definitions
console.log('📋 Step definitions:');
const steps = VerificationFlowManager.getStepDefinitions();
steps.forEach(step => {
  console.log(`  Step ${step.number}: ${step.title} (${step.route})`);
});

// Test 2: Test step completion and navigation
console.log('\n🔄 Testing step completion:');

// Test completing step 2 (identity verification)
try {
  console.log('Testing "Use Existing" button flow (step 2 -> step 3)...');
  
  const mockData = { documentType: 'passport', documentNumber: 'ABC123' };
  const mockCallback = (nextStep) => {
    console.log(`✅ Navigation callback called for step ${nextStep}`);
  };
  
  // This should navigate from step 2 to step 3
  const result = VerificationFlowManager.completeStepAndNavigate(2, mockData, mockCallback);
  console.log('Step completion result:', result);
  
} catch (error) {
  console.error('❌ Error testing step completion:', error.message);
}

// Test 3: Test all step transitions
console.log('\n🎯 Testing all step transitions:');
for (let i = 1; i <= 8; i++) {
  try {
    const nextStep = VerificationFlowManager.getNextStep(i);
    console.log(`  Step ${i} -> Step ${nextStep || 'Complete'}`);
  } catch (error) {
    console.error(`  ❌ Error getting next step for ${i}:`, error.message);
  }
}

console.log('\n✅ VerificationFlowManager test completed!');