// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@coti-io/coti-contracts/contracts/utils/mpc/MpcCore.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title EncryptedMedicalRecords
 * @dev Smart contract for storing and managing encrypted medical records with patient and doctor access control
 */
contract EncryptedMedicalRecords is AccessControl, ReentrancyGuard {
  bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
  
  uint64 public constant MAX_EXAM_VALUE = 1000000;
  uint64 public constant MIN_EXAM_VALUE = 0;
  
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
  
  // Patient address => Record ID => Medical Record
  mapping(address => mapping(uint256 => MedicalRecord)) private _patientRecords;
  
  // Patient address => number of records
  mapping(address => uint256) private _patientRecordCount;
  
  // Doctor address => Doctor Info
  mapping(address => DoctorInfo) private _doctors;
  
  // Patient address => Doctor address => authorized
  mapping(address => mapping(address => bool)) private _doctorAuthorizations;
  
  // Track if patient has any records
  mapping(address => bool) private _hasRecords;
  
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
  
  constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(ADMIN_ROLE, msg.sender);
  }
  
  /**
   * @dev Register a new doctor
   * @param _doctorAddress Address of the doctor
   * @param _name Name of the doctor
   * @param _specialty Medical specialty
   */
  function registerDoctor(
    address _doctorAddress,
    string memory _name,
    string memory _specialty
  ) external onlyRole(ADMIN_ROLE) {
    require(_doctorAddress != address(0), "Invalid doctor address");
    require(bytes(_name).length > 0, "Name cannot be empty");
    require(bytes(_specialty).length > 0, "Specialty cannot be empty");
    require(!_doctors[_doctorAddress].isVerified, "Doctor already registered");
    
    _doctors[_doctorAddress] = DoctorInfo({
      name: _name,
      specialty: _specialty,
      isVerified: true,
      registrationDate: block.timestamp
    });
    
    _setupRole(DOCTOR_ROLE, _doctorAddress);
    
    emit DoctorRegistered(_doctorAddress, _name, _specialty, block.timestamp);
  }
  
  /**
   * @dev Add a new encrypted medical record
   * @param _patient Address of the patient
   * @param _examName Name of the medical exam
   * @param _encryptedValue Encrypted exam value
   * @return recordId The ID of the created record
   */
  function addMedicalRecord(
    address _patient,
    string memory _examName,
    itUint64 calldata _encryptedValue
  ) external onlyRole(DOCTOR_ROLE) nonReentrant returns (uint256 recordId) {
    require(_patient != address(0), "Invalid patient address");
    require(bytes(_examName).length > 0, "Exam name cannot be empty");
    require(_doctors[msg.sender].isVerified, "Doctor not verified");
    
    // Validate encrypted value
    gtUint64 validatedValue = MpcCore.validateCiphertext(_encryptedValue);
    gtUint64 minValue = MpcCore.setPublic64(MIN_EXAM_VALUE);
    gtUint64 maxValue = MpcCore.setPublic64(MAX_EXAM_VALUE);
    
    gtBool isValidMin = MpcCore.ge(validatedValue, minValue);
    gtBool isValidMax = MpcCore.le(validatedValue, maxValue);
    
    require(
      MpcCore.decrypt(isValidMin) && MpcCore.decrypt(isValidMax),
      "Exam value out of range"
    );
    
    recordId = _patientRecordCount[_patient];
    ctUint64 storedValue = MpcCore.offBoard(validatedValue);
    
    _patientRecords[_patient][recordId] = MedicalRecord({
      examName: _examName,
      examValue: storedValue,
      timestamp: block.timestamp,
      patient: _patient,
      doctor: msg.sender,
      isActive: true
    });
    
    _patientRecordCount[_patient]++;
    _hasRecords[_patient] = true;
    
    emit RecordAdded(_patient, msg.sender, recordId, _examName, block.timestamp);
    
    return recordId;
  }
  
  /**
   * @dev Authorize a doctor to access patient's records
   * @param _doctor Address of the doctor to authorize
   */
  function authorizeDoctor(address _doctor) external {
    require(_doctor != address(0), "Invalid doctor address");
    require(hasRole(DOCTOR_ROLE, _doctor), "Address is not a registered doctor");
    require(_doctors[_doctor].isVerified, "Doctor not verified");
    require(!_doctorAuthorizations[msg.sender][_doctor], "Doctor already authorized");
    
    _doctorAuthorizations[msg.sender][_doctor] = true;
    
    emit DoctorAuthorized(msg.sender, _doctor, block.timestamp);
  }
  
  /**
   * @dev Revoke doctor's access to patient's records
   * @param _doctor Address of the doctor to revoke
   */
  function revokeDoctor(address _doctor) external {
    require(_doctor != address(0), "Invalid doctor address");
    require(_doctorAuthorizations[msg.sender][_doctor], "Doctor not authorized");
    
    _doctorAuthorizations[msg.sender][_doctor] = false;
    
    emit DoctorRevoked(msg.sender, _doctor, block.timestamp);
  }
  
  /**
   * @dev Get encrypted medical record value for the patient
   * @param _recordId ID of the medical record
   * @return valueForPatient Encrypted value accessible by patient
   */
  function getRecordForPatient(uint256 _recordId) external returns (ctUint64 valueForPatient) {
    require(_hasRecords[msg.sender], "No records found");
    require(_recordId < _patientRecordCount[msg.sender], "Record does not exist");
    
    MedicalRecord storage record = _patientRecords[msg.sender][_recordId];
    require(record.isActive, "Record is not active");
    
    gtUint64 gtValue = MpcCore.onBoard(record.examValue);
    valueForPatient = MpcCore.offBoardToUser(gtValue, msg.sender);
    
    emit RecordAccessed(msg.sender, msg.sender, _recordId, block.timestamp);
    
    return valueForPatient;
  }
  
  /**
   * @dev Get encrypted medical record value for authorized doctor
   * @param _patient Address of the patient
   * @param _recordId ID of the medical record
   * @return valueForDoctor Encrypted value accessible by doctor
   */
  function getRecordForDoctor(
    address _patient,
    uint256 _recordId
  ) external onlyRole(DOCTOR_ROLE) returns (ctUint64 valueForDoctor) {
    require(_patient != address(0), "Invalid patient address");
    require(_hasRecords[_patient], "Patient has no records");
    require(_recordId < _patientRecordCount[_patient], "Record does not exist");
    require(
      _doctorAuthorizations[_patient][msg.sender],
      "Doctor not authorized by patient"
    );
    
    MedicalRecord storage record = _patientRecords[_patient][_recordId];
    require(record.isActive, "Record is not active");
    
    gtUint64 gtValue = MpcCore.onBoard(record.examValue);
    valueForDoctor = MpcCore.offBoardToUser(gtValue, msg.sender);
    
    emit RecordAccessed(_patient, msg.sender, _recordId, block.timestamp);
    
    return valueForDoctor;
  }
  
  /**
   * @dev Get medical record metadata (non-encrypted information)
   * @param _patient Address of the patient
   * @param _recordId ID of the medical record
   * @return examName Name of the exam
   * @return timestamp When the record was created
   * @return doctor Address of the doctor who created the record
   * @return isActive Whether the record is active
   */
  function getRecordMetadata(
    address _patient,
    uint256 _recordId
  ) external view returns (
    string memory examName,
    uint256 timestamp,
    address doctor,
    bool isActive
  ) {
    require(_patient != address(0), "Invalid patient address");
    require(_hasRecords[_patient], "Patient has no records");
    require(_recordId < _patientRecordCount[_patient], "Record does not exist");
    
    // Allow access to metadata if caller is patient or authorized doctor
    require(
      msg.sender == _patient || 
      (_doctorAuthorizations[_patient][msg.sender] && hasRole(DOCTOR_ROLE, msg.sender)),
      "Not authorized to view record metadata"
    );
    
    MedicalRecord storage record = _patientRecords[_patient][_recordId];
    
    return (
      record.examName,
      record.timestamp,
      record.doctor,
      record.isActive
    );
  }
  
  /**
   * @dev Get patient's total record count
   * @param _patient Address of the patient
   * @return count Number of records for the patient
   */
  function getPatientRecordCount(address _patient) external view returns (uint256 count) {
    require(_patient != address(0), "Invalid patient address");
    require(
      msg.sender == _patient || 
      (_doctorAuthorizations[_patient][msg.sender] && hasRole(DOCTOR_ROLE, msg.sender)),
      "Not authorized to view record count"
    );
    
    return _patientRecordCount[_patient];
  }
  
  /**
   * @dev Check if doctor is authorized by patient
   * @param _patient Address of the patient
   * @param _doctor Address of the doctor
   * @return authorized Whether doctor is authorized
   */
  function isDoctorAuthorized(
    address _patient,
    address _doctor
  ) external view returns (bool authorized) {
    require(_patient != address(0), "Invalid patient address");
    require(_doctor != address(0), "Invalid doctor address");
    
    return _doctorAuthorizations[_patient][_doctor];
  }
  
  /**
   * @dev Get doctor information
   * @param _doctor Address of the doctor
   * @return name Doctor's name
   * @return specialty Doctor's specialty
   * @return isVerified Whether doctor is verified
   * @return registrationDate When doctor was registered
   */
  function getDoctorInfo(address _doctor) external view returns (
    string memory name,
    string memory specialty,
    bool isVerified,
    uint256 registrationDate
  ) {
    require(_doctor != address(0), "Invalid doctor address");
    
    DoctorInfo storage doctor = _doctors[_doctor];
    return (doctor.name, doctor.specialty, doctor.isVerified, doctor.registrationDate);
  }
  
  /**
   * @dev Deactivate a medical record
   * @param _recordId ID of the record to deactivate
   */
  function deactivateRecord(uint256 _recordId) external {
    require(_hasRecords[msg.sender], "No records found");
    require(_recordId < _patientRecordCount[msg.sender], "Record does not exist");
    
    MedicalRecord storage record = _patientRecords[msg.sender][_recordId];
    require(record.isActive, "Record already inactive");
    
    record.isActive = false;
  }
  
  /**
   * @dev Check if patient has any records
   * @param _patient Address of the patient
   * @return hasRecords Whether patient has records
   */
  function patientHasRecords(address _patient) external view returns (bool hasRecords) {
    require(_patient != address(0), "Invalid patient address");
    return _hasRecords[_patient];
  }
}
