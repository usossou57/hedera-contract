// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AccessControlContract {
    
    // Énumération des rôles
    enum Role { PATIENT, DOCTOR, ADMIN, NURSE, PHARMACIST }
    
    // Structure pour les utilisateurs
    struct User {
        address userAddress;
        Role role;
        bool isActive;
        string publicKey; // Clé publique pour chiffrement
        string professionalId; // ID professionnel (pour médecins, etc.)
        uint256 registrationDate;
    }
    
    // Structure pour les permissions
    struct Permission {
        uint256 permissionId;
        address grantor;      // Qui donne l'autorisation
        address grantee;      // Qui reçoit l'autorisation
        uint256 patientId;    // Patient concerné
        uint256 expirationDate;
        bool isActive;
        string[] allowedActions; // Actions autorisées
        uint256 creationDate;
    }
    
    // Structure pour les logs d'accès
    struct AccessLog {
        uint256 logId;
        address accessor;
        uint256 patientId;
        string action;
        uint256 timestamp;
        bool success;
        string details;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(address => bool) public registeredUsers;
    mapping(uint256 => Permission) public permissions;
    mapping(address => uint256[]) public userPermissions; // Permissions par utilisateur
    mapping(uint256 => uint256[]) public patientPermissions; // Permissions par patient
    mapping(uint256 => AccessLog) public accessLogs;
    
    // Compteurs
    uint256 public nextPermissionId = 1;
    uint256 public nextLogId = 1;
    
    // Adresse du contrat PatientIdentity
    address public patientIdentityContract;
    
    // Événements
    event UserRegistered(
        address indexed userAddress, 
        Role role, 
        string professionalId
    );
    
    event PermissionGranted(
        uint256 indexed permissionId,
        address indexed grantor,
        address indexed grantee,
        uint256 patientId
    );
    
    event PermissionRevoked(
        uint256 indexed permissionId,
        address indexed revokedBy
    );
    
    event AccessAttempted(
        uint256 indexed logId,
        address indexed accessor,
        uint256 patientId,
        string action,
        bool success
    );
    
    event UserDeactivated(address indexed userAddress);
    event UserReactivated(address indexed userAddress);
    
    // Modificateurs
    modifier onlyRegisteredUser() {
        require(registeredUsers[msg.sender], "Utilisateur non enregistre");
        require(users[msg.sender].isActive, "Utilisateur desactive");
        _;
    }
    
    modifier onlyRole(Role _role) {
        require(users[msg.sender].role == _role, "Role non autorise");
        _;
    }
    
    modifier onlyAdminOrPatient(uint256 _patientId) {
        require(
            users[msg.sender].role == Role.ADMIN ||
            isPatientOwner(_patientId, msg.sender),
            "Acces non autorise"
        );
        _;
    }
    
    /**
     * @dev Constructeur
     * @param _patientIdentityContract Adresse du contrat PatientIdentity
     */
    constructor(address _patientIdentityContract) {
        patientIdentityContract = _patientIdentityContract;
        
        // Enregistrer le déployeur comme admin
        users[msg.sender] = User({
            userAddress: msg.sender,
            role: Role.ADMIN,
            isActive: true,
            publicKey: "",
            professionalId: "ADMIN_001",
            registrationDate: block.timestamp
        });
        registeredUsers[msg.sender] = true;
        
        emit UserRegistered(msg.sender, Role.ADMIN, "ADMIN_001");
    }
    
    /**
     * @dev Enregistrer un nouvel utilisateur
     * @param _userAddress Adresse de l'utilisateur
     * @param _role Rôle de l'utilisateur
     * @param _publicKey Clé publique pour chiffrement
     * @param _professionalId ID professionnel
     */
    function registerUser(
        address _userAddress,
        Role _role,
        string memory _publicKey,
        string memory _professionalId
    ) public onlyRegisteredUser onlyRole(Role.ADMIN) {
        require(_userAddress != address(0), "Adresse invalide");
        require(!registeredUsers[_userAddress], "Utilisateur deja enregistre");
        require(bytes(_professionalId).length > 0, "ID professionnel requis");
        
        users[_userAddress] = User({
            userAddress: _userAddress,
            role: _role,
            isActive: true,
            publicKey: _publicKey,
            professionalId: _professionalId,
            registrationDate: block.timestamp
        });
        
        registeredUsers[_userAddress] = true;
        
        emit UserRegistered(_userAddress, _role, _professionalId);
    }
    
    /**
     * @dev Accorder une permission d'accès
     * @param _grantee Qui reçoit la permission
     * @param _patientId ID du patient
     * @param _expirationDate Date d'expiration (timestamp)
     * @param _allowedActions Actions autorisées
     */
    function grantPermission(
        address _grantee,
        uint256 _patientId,
        uint256 _expirationDate,
        string[] memory _allowedActions
    ) public onlyRegisteredUser returns (uint256) {
        require(registeredUsers[_grantee], "Beneficiaire non enregistre");
        require(_patientId > 0, "ID patient invalide");
        require(
            _expirationDate > block.timestamp,
            "Date d'expiration dans le passe"
        );
        require(
            isPatientOwner(_patientId, msg.sender) || 
            users[msg.sender].role == Role.ADMIN,
            "Non autorise a accorder cette permission"
        );
        
        uint256 permissionId = nextPermissionId;
        
        permissions[permissionId] = Permission({
            permissionId: permissionId,
            grantor: msg.sender,
            grantee: _grantee,
            patientId: _patientId,
            expirationDate: _expirationDate,
            isActive: true,
            allowedActions: _allowedActions,
            creationDate: block.timestamp
        });
        
        userPermissions[_grantee].push(permissionId);
        patientPermissions[_patientId].push(permissionId);
        
        nextPermissionId++;
        
        emit PermissionGranted(permissionId, msg.sender, _grantee, _patientId);
        return permissionId;
    }
    
    /**
     * @dev Révoquer une permission
     * @param _permissionId ID de la permission
     */
    function revokePermission(uint256 _permissionId) 
        public 
        onlyRegisteredUser 
    {
        Permission storage permission = permissions[_permissionId];
        require(permission.permissionId != 0, "Permission inexistante");
        require(permission.isActive, "Permission deja revoquee");
        require(
            permission.grantor == msg.sender ||
            users[msg.sender].role == Role.ADMIN ||
            isPatientOwner(permission.patientId, msg.sender),
            "Non autorise a revoquer cette permission"
        );
        
        permission.isActive = false;
        
        emit PermissionRevoked(_permissionId, msg.sender);
    }
    
    /**
     * @dev Vérifier si un utilisateur a une permission spécifique
     * @param _user Adresse de l'utilisateur
     * @param _patientId ID du patient
     * @param _action Action demandée
     * @return bool Vrai si autorisé
     */
    function checkPermission(
        address _user,
        uint256 _patientId,
        string memory _action
    ) public view returns (bool) {
        // Le patient a toujours accès à ses propres données
        if (isPatientOwner(_patientId, _user)) {
            return true;
        }
        
        // Admin a accès à tout
        if (users[_user].role == Role.ADMIN) {
            return true;
        }
        
        // Vérifier les permissions spécifiques
        uint256[] memory userPerms = userPermissions[_user];
        
        for (uint i = 0; i < userPerms.length; i++) {
            Permission memory perm = permissions[userPerms[i]];
            
            if (perm.isActive && 
                perm.patientId == _patientId && 
                perm.expirationDate > block.timestamp) {
                
                // Vérifier si l'action est autorisée
                for (uint j = 0; j < perm.allowedActions.length; j++) {
                    if (keccak256(bytes(perm.allowedActions[j])) == keccak256(bytes(_action))) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * @dev Logger une tentative d'accès
     * @param _accessor Qui tente l'accès
     * @param _patientId ID du patient
     * @param _action Action tentée
     * @param _success Succès ou échec
     * @param _details Détails supplémentaires
     */
    function logAccess(
        address _accessor,
        uint256 _patientId,
        string memory _action,
        bool _success,
        string memory _details
    ) public returns (uint256) {
        uint256 logId = nextLogId;
        
        accessLogs[logId] = AccessLog({
            logId: logId,
            accessor: _accessor,
            patientId: _patientId,
            action: _action,
            timestamp: block.timestamp,
            success: _success,
            details: _details
        });
        
        nextLogId++;
        
        emit AccessAttempted(logId, _accessor, _patientId, _action, _success);
        return logId;
    }
    
    /**
     * @dev Obtenir les permissions d'un utilisateur
     * @param _user Adresse de l'utilisateur
     * @return uint256[] Liste des IDs de permissions
     */
    function getUserPermissions(address _user) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return userPermissions[_user];
    }
    
    /**
     * @dev Obtenir les permissions pour un patient
     * @param _patientId ID du patient
     * @return uint256[] Liste des IDs de permissions
     */
    function getPatientPermissions(uint256 _patientId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return patientPermissions[_patientId];
    }
    
    /**
     * @dev Obtenir les informations d'un utilisateur
     * @param _userAddress Adresse de l'utilisateur
     * @return User Structure utilisateur
     */
    function getUserInfo(address _userAddress) 
        public 
        view 
        returns (User memory) 
    {
        require(registeredUsers[_userAddress], "Utilisateur non enregistre");
        return users[_userAddress];
    }
    
    /**
     * @dev Désactiver un utilisateur
     * @param _userAddress Adresse de l'utilisateur
     */
    function deactivateUser(address _userAddress) 
        public 
        onlyRegisteredUser 
        onlyRole(Role.ADMIN) 
    {
        require(registeredUsers[_userAddress], "Utilisateur non enregistre");
        require(users[_userAddress].isActive, "Utilisateur deja desactive");
        
        users[_userAddress].isActive = false;
        
        emit UserDeactivated(_userAddress);
    }
    
    /**
     * @dev Réactiver un utilisateur
     * @param _userAddress Adresse de l'utilisateur
     */
    function reactivateUser(address _userAddress) 
        public 
        onlyRegisteredUser 
        onlyRole(Role.ADMIN) 
    {
        require(registeredUsers[_userAddress], "Utilisateur non enregistre");
        require(!users[_userAddress].isActive, "Utilisateur deja actif");
        
        users[_userAddress].isActive = true;
        
        emit UserReactivated(_userAddress);
    }
    
    /*
     * @dev Vérifier si une adresse est propriétaire d'un patient
     * @param _patientId ID du patient
     * @param _address Adresse à vérifier
     * @return bool Vrai si propriétaire
     */
    function isPatientOwner(uint256 /*_patientId*/, address /*_address*/) 
        internal 
        pure 
        returns (bool) 
    {
        // Cette fonction devrait appeler le contrat PatientIdentity
        // Pour simplifier, on assume que c'est implémenté
        // Dans la vraie implémentation, il faudrait un appel inter-contrat
        return true; // Placeholder - à implémenter avec le contrat Patient
    }
    
    /**
     * @dev Obtenir le nombre total de permissions actives
     * @return uint256 Nombre de permissions
     */
    function getTotalActivePermissions() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextPermissionId; i++) {
            if (permissions[i].isActive && 
                permissions[i].expirationDate > block.timestamp) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Nettoyer les permissions expirées
     * @return uint256 Nombre de permissions nettoyées
     */
    function cleanExpiredPermissions() public returns (uint256) {
        uint256 cleaned = 0;
        for (uint256 i = 1; i < nextPermissionId; i++) {
            if (permissions[i].isActive && 
                permissions[i].expirationDate <= block.timestamp) {
                permissions[i].isActive = false;
                cleaned++;
            }
        }
        return cleaned;
    }
}