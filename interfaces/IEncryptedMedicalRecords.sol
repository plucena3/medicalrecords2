// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@coti-io/coti-contracts/contracts/utils/mpc/MpcCore.sol";

/**
 * @title IEncryptedMedicalRecords
 * @dev Interface for encrypted medical records contract
 */
interface IEncryptedMedicalRecords {
  struct MedicalRecord {
    string examName;
    ctUint64 examValue;
    uint256 timestamp;
    address patient;
    address doctor;
    bool isActive;
  }
  
  struct DoctorInfo {
    string name;
    string specialty;
    bool isVerified;
    uint256 registrationDate;
  }
  
  event RecordAdded(
    address indexed patient,
    address indexed doctor,
    uint256 indexed recordId,
    string examName,
    uint256 timestamp
  );
  
  event DoctorAuthorized(
    address indexed patient,
    address indexed doctor,
    uint256 timestamp
  );
  
  event DoctorRevoked(
    address indexed patient,
    address indexed doctor,
    uint256 timestamp
  );
  
  event DoctorRegistered(
    address indexed doctor,
    string name,
    string specialty,
    uint256 timestamp
  );
  
  event RecordAccessed(
    address indexed patient,
    address indexed accessor,
    uint256 indexed recordId,
    uint256 timestamp
  );
  
  function registerDoctor(
    address _doctorAddress,
    string memory _name,
    string memory _specialty
  ) external;
  
  function addMedicalRecord(
    address _patient,
    string memory _examName,
    itUint64 calldata _encryptedValue
  ) external returns (uint256 recordId);
  
  function authorizeDoctor(address _doctor) external;
  
  function revokeDoctor(address _doctor) external;
  
  function getRecordForPatient(uint256 _recordId) external returns (ctUint64 valueForPatient);
  
  function getRecordForDoctor(
    address _patient,
    uint256 _recordId
  ) external returns (ctUint64 valueForDoctor);
  
  function getRecordMetadata(
    address _patient,
    uint256 _recordId
  ) external view returns (
    string memory examName,
    uint256 timestamp,
    address doctor,
    bool isActive
  );
  
  function getPatientRecordCount(address _patient) external view returns (uint256 count);
  
  function isDoctorAuthorized(
    address _patient,
    address _doctor
  ) external view returns (bool authorized);
  
  function getDoctorInfo(address _doctor) external view returns (
    string memory name,
    string memory specialty,
    bool isVerified,
    uint256 registrationDate
  );
  
  function deactivateRecord(uint256 _recordId) external;
  
  function patientHasRecords(address _patient) external view returns (bool hasRecords);
}
