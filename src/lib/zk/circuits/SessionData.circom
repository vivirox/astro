pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

/**
 * Circuit for verifying session data
 * 
 * Inputs:
 * - sessionId: Unique identifier for the session
 * - userId: User identifier associated with the session
 * - startTime: Timestamp when the session started
 * - metadata: Optional additional data
 * - publicHash: Public hash of the session data
 */
template SessionDataCircuit() {
    // Private inputs
    signal input sessionId;
    signal input userId;
    signal input startTime;
    signal input metadata;
    
    // Public inputs
    signal input publicHash;
    
    // Compute the hash of the session data
    component hasher = Poseidon(4);
    hasher.inputs[0] <== sessionId;
    hasher.inputs[1] <== userId;
    hasher.inputs[2] <== startTime;
    hasher.inputs[3] <== metadata;
    
    // Verify that the computed hash matches the public hash
    publicHash === hasher.out;
}

component main = SessionDataCircuit(); 