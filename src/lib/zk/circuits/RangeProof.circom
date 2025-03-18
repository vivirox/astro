pragma circom 2.0.0;

include "circomlib/poseidon.circom";
include "circomlib/comparators.circom";

/**
 * RangeProofCircuit - Verifies that a value is within a specified range
 * 
 * Inputs:
 *   - value: The value to check is within range
 *   - min: The minimum value of the range
 *   - max: The maximum value of the range
 * 
 * Public Inputs:
 *   - min: The minimum value of the range
 *   - max: The maximum value of the range
 *   - publicHash: The hash of the value and range
 */
template RangeProofCircuit() {
    // Private inputs
    signal input value;
    
    // Public inputs
    signal input min;
    signal input max;
    signal input publicHash;
    
    // Intermediate signals
    signal greaterThanMin;
    signal lessThanMax;
    signal withinRange;
    signal computedHash;
    
    // Check that value >= min
    component gtMin = GreaterEqThan(64);
    gtMin.in[0] <== value;
    gtMin.in[1] <== min;
    greaterThanMin <== gtMin.out;
    
    // Check that value <= max
    component ltMax = LessEqThan(64);
    ltMax.in[0] <== value;
    ltMax.in[1] <== max;
    lessThanMax <== ltMax.out;
    
    // Check that value is within range
    withinRange <== greaterThanMin * lessThanMax;
    withinRange === 1;
    
    // Compute the hash of the value and range
    component hasher = Poseidon(3);
    hasher.inputs[0] <== value;
    hasher.inputs[1] <== min;
    hasher.inputs[2] <== max;
    computedHash <== hasher.out;
    
    // Verify that the computed hash matches the public hash
    computedHash === publicHash;
}

component main {public [min, max, publicHash]} = RangeProofCircuit(); 