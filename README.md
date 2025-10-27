# Encrypted Medical Records System

A privacy-preserving smart contract system for managing medical records using Multi-Party Computation (MPC) encryption on the COTI blockchain.

## Architecture Overview

The `EncryptedMedicalRecords` contract provides a secure, decentralized solution for storing and managing sensitive medical data with granular access control. The system uses COTI's MPC technology to ensure that medical exam values remain encrypted while allowing authorized parties to access them.

### Key Components

#### 1. Data Structures

**MedicalRecord Struct:**
```solidity
struct MedicalRecord {
    string examName;        // Name of the medical examination
    ctUint64 examValue;     // Encrypted exam value using COTI MPC
    uint256 timestamp;      // Record creation timestamp
    address patient;        // Patient's wallet address
    address doctor;         // Doctor who created the record
    bool isActive;         // Record status (active/inactive)
}
```

**DoctorInfo Struct:**
```solidity
struct DoctorInfo {
    string name;            // Doctor's full name
    string specialty;       // Medical specialty
    bool isVerified;        // Verification status
    uint256 registrationDate; // Registration timestamp
}
```

#### 2. Access Control System

The contract implements a role-based access control system with three primary roles:

- **Admin Role (`ADMIN_ROLE`)**: Can register and verify doctors
- **Doctor Role (`DOCTOR_ROLE`)**: Can create medical records for patients
- **Patient Role**: Implicit role for any wallet address that can authorize doctors and access their own records

#### 3. Data Storage Mappings

The contract uses five key mappings to manage data storage and access control:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTED MEDICAL RECORDS MAPPINGS                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│      PATIENTS       │    │       DOCTORS       │    │       ADMIN         │
│   (Wallet Address)  │    │   (Wallet Address)  │    │   (Wallet Address)  │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                          │                          │
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   _hasRecords       │    │     _doctors        │    │  Registers Doctors  │
│ Patient → Boolean   │    │ Doctor → DoctorInfo │    │     (Function)      │
│                     │    │                     │    │                     │
│ 0x123... → true     │    │ 0x789... → {        │    │ Admin creates       │
│ 0x456... → false    │    │   name: "Dr.Smith"  │    │ doctor accounts     │
│                     │    │   specialty: "Card" │    │                     │
└───��─────────────────┘    │   isVerified: true  │    └─────────────────────┘
          │                │ }                   │              │
          │                └─────────────────────┘              │
          │                          │                          │
          ▼                          │                          │
┌─────────────────────┐              │                          │
│_patientRecordCount  │              │                          │
│ Patient → Count     │              │                          │
│                     │              │                          │
│ 0x123... → 3        │              │                          │
│ 0x456... → 1        │              │                          │
└─────────────────────┘              │                          │
          │                          │                          │
          │                          │                          │
          ▼                          │                          │
┌─────────────────────────────────────┼──────────────────────────┼─────────────┐
│              _patientRecords        │                          │             │
│     Patient → RecordID → Record     │                          │             │
│                                     │                          │             │
│ 0x123... → 0 → {                    │          ┌────────────────────────────────┐
│   examName: "Blood Test"            │          │     _doctorAuthorizations      │
│   examValue: ctUint64 (encrypted)   │          │   Patient → Doctor → Boolean   │
│   timestamp: 1729234567             │          │                                │
│   patient: 0x123...                 │          │ 0x123... → 0x789... → true     │
│   doctor: 0x789...          ◄───────┼──────────│ 0x123... → 0xABC... → false    │
│   isActive: true                    │          │ 0x456... → 0x789... → true     │
│ }                                   │          │                                │
│                                     ���          │ (Patient authorizes doctors    │
│ 0x123... → 1 → { ... }              │          │  to access their records)      │
│ 0x123... → 2 → { ... }              │          └────────────────────────────────┘
└─────────────────────────────────────┘                           │
                                                                  │
┌─────────────────────────────────────────────────────────────────┼─────────────┐
│                            DATA FLOW                            │             │
└─────────────────────────────────────────────────────────────────┼─────────────┘
                                                                  │
1. Admin registers doctor → _doctors[doctorAddr] = DoctorInfo     │
2. Doctor adds record → _patientRecords[patient][recordId] = Record
3. Patient authorizes doctor → _doctorAuthorizations[patient][doctor] = true
4. Doctor/Patient accesses → Check authorizations → Return encrypted data

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ACCESS PATTERNS                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

PATIENT ACCESS:                          DOCTOR ACCESS:
┌─────────────┐                         ┌─────────────┐
│   Patient   │                         │   Doctor    │
│  (msg.sender)│                        │ (msg.sender)│
└─────────────┘                         └─────────────┘
      │                                       │
      ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│_hasRecords  │                         │_doctors     │
│[patient]    │                         │[doctor]     │
└─────────────┘                         │.isVerified  │
      │                                 └─────────────┘
      ▼                                       │
┌────────────────┐                               ▼
│_patientRecords │                    ┌──────────────────────┐
│[patient][id]   │                    │_doctorAuthorizations │ 
└────────────────┘                    │[patient][doctor]     │
      │                               └──────────────────────┘
      ▼                                      │
┌─────────────┐                              ▼
│   Return    │                       ┌───────────────┐
│ Encrypted   │                       │_patientRecords│
│   Value     │                       │[patient][id]  │
└─────────────���                       └───────────────┘
                                            │
                                            ▼
                                      ┌─────────────┐
                                      │   Return    │
                                      │ Encrypted   │
                                      │   Value     │
                                      └─────────────┘
```

**1. Main Medical Records Storage**
```solidity
mapping(address => mapping(uint256 => MedicalRecord)) private _patientRecords;
```
- **Structure**: `Patient Address → Record ID → Medical Record`
- **Purpose**: Nested mapping storing all medical records
- **Example**: Patient `0x123...` → Record ID `0` → Complete medical record with encrypted data

**2. Record Counter**
```solidity
mapping(address => uint256) private _patientRecordCount;
```
- **Structure**: `Patient Address → Number of Records`
- **Purpose**: Tracks total records per patient, generates unique record IDs
- **Example**: Patient `0x123...` → `3` (has records with IDs: 0, 1, 2)

**3. Doctor Registry**
```solidity
mapping(address => DoctorInfo) private _doctors;
```
- **Structure**: `Doctor Address → Doctor Information`
- **Purpose**: Stores verified doctor credentials and metadata
- **Example**: Doctor `0x789...` → `{name: "Dr. Smith", specialty: "Cardiology", isVerified: true}`

**4. Access Control Matrix**
```solidity
mapping(address => mapping(address => bool)) private _doctorAuthorizations;
```
- **Structure**: `Patient Address → Doctor Address → Authorization Status`
- **Purpose**: Manages granular access permissions per patient-doctor pair
- **Example**: Patient `0x123...` → Doctor `0x789...` → `true` (authorized)

**5. Record Existence Tracker**
```solidity
mapping(address => bool) private _hasRecords;
```
- **Structure**: `Patient Address → Has Records Boolean`
- **Purpose**: Gas-efficient check for record existence before expensive operations
- **Example**: Patient `0x123...` → `true` (has medical records)

**How They Work Together:**

*Creating a New Record:*
1. Check `_doctors[doctorAddress].isVerified` ✓
2. Get next ID from `_patientRecordCount[patientAddress]`
3. Store record in `_patientRecords[patientAddress][recordId]`
4. Increment `_patientRecordCount[patientAddress]++`
5. Set `_hasRecords[patientAddress] = true`

*Doctor Access Control:*
1. Check `_hasRecords[patientAddress]` (quick exit if no records)
2. Verify `_doctorAuthorizations[patientAddress][doctorAddress] == true`
3. Retrieve record from `_patientRecords[patientAddress][recordId]`

#### 4. Privacy and Encryption

The system leverages COTI's Multi-Party Computation (MPC) framework to ensure data privacy:

- **Input Encryption**: Medical exam values are encrypted using `itUint64` (input encrypted integer)
- **Storage**: Values are stored as `ctUint64` (ciphertext) on-chain
- **Access Control**: Only authorized parties can decrypt values using `MpcCore.offBoardToUser()`
- **Range Validation**: Encrypted values are validated within predefined ranges without decryption

## Core Functionality

### 1. Doctor Registration
```solidity
function registerDoctor(address _doctorAddress, string memory _name, string memory _specialty)
```
- **Caller**: Admin only
- **Purpose**: Register and verify healthcare providers
- **Access**: Grants `DOCTOR_ROLE` to verified doctors

### 2. Medical Record Management

#### Adding Records
```solidity
function addMedicalRecord(address _patient, string memory _examName, itUint64 calldata _encryptedValue)
```
- **Caller**: Verified doctors only
- **Process**:
  1. Validates encrypted exam value within acceptable range (0-1,000,000)
  2. Stores encrypted value using `MpcCore.offBoard()`
  3. Emits `RecordAdded` event
- **Privacy**: Exam values remain encrypted throughout the process

#### Patient Access
```solidity
function getRecordForPatient(uint256 _recordId) returns (ctUint64 valueForPatient)
```
- **Caller**: Patient (record owner)
- **Purpose**: Allows patients to access their own encrypted medical data
- **Decryption**: Uses `MpcCore.offBoardToUser()` to provide patient-specific encrypted value

#### Doctor Access
```solidity
function getRecordForDoctor(address _patient, uint256 _recordId) returns (ctUint64 valueForDoctor)
```
- **Caller**: Authorized doctors only
- **Requirements**: Doctor must be authorized by the patient
- **Decryption**: Provides doctor-specific encrypted value for authorized access

### 3. Authorization System

#### Granting Access
```solidity
function authorizeDoctor(address _doctor)
```
- **Caller**: Patient
- **Purpose**: Grant specific doctors access to patient's medical records
- **Event**: Emits `DoctorAuthorized` event

#### Revoking Access
```solidity
function revokeDoctor(address _doctor)
```
- **Caller**: Patient
- **Purpose**: Remove doctor's access to patient's medical records
- **Event**: Emits `DoctorRevoked` event

### 4. Metadata and Information Access

#### Record Metadata
```solidity
function getRecordMetadata(address _patient, uint256 _recordId)
```
- **Returns**: Non-encrypted information (exam name, timestamp, doctor, status)
- **Access**: Patient or authorized doctors

#### Doctor Information
```solidity
function getDoctorInfo(address _doctor)
```
- **Returns**: Doctor's name, specialty, verification status, and registration date
- **Access**: Public read access

## Security Features

### 1. Privacy Protection
- **End-to-End Encryption**: Medical values never exist in plaintext on-chain
- **User-Specific Decryption**: Each authorized party receives their own encrypted version
- **Range Validation**: Values validated without revealing actual content

### 2. Access Control
- **Role-Based Permissions**: Strict role enforcement for all sensitive operations
- **Patient Autonomy**: Patients control doctor access to their records
- **Reentrancy Protection**: `ReentrancyGuard` prevents reentrancy attacks

### 3. Data Integrity
- **Immutable Records**: Medical records cannot be modified once created
- **Audit Trail**: All access and modifications are logged via events
- **Active Status**: Records can be deactivated but not deleted

## Smart Contract Events

- `RecordAdded`: New medical record creation
- `DoctorAuthorized`: Patient grants doctor access
- `DoctorRevoked`: Patient revokes doctor access
- `DoctorRegistered`: New doctor registration by admin
- `RecordAccessed`: Record access by patient or authorized doctor

## Usage Workflow

1. **Setup**: Admin registers and verifies doctors
2. **Record Creation**: Doctor creates encrypted medical records for patients
3. **Authorization**: Patients authorize specific doctors to access their records
4. **Access**: Patients and authorized doctors can retrieve encrypted exam values
5. **Management**: Patients can revoke doctor access or deactivate records as needed

## Technology Stack

- **Blockchain**: COTI Network
- **Encryption**: COTI MPC (Multi-Party Computation)
- **Access Control**: OpenZeppelin AccessControl
- **Security**: OpenZeppelin ReentrancyGuard
- **Language**: Solidity ^0.8.19

This architecture ensures that sensitive medical data remains private and secure while enabling necessary access for healthcare providers and patients in a decentralized environment.
