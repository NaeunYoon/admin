-- 사용자 정보 업데이트
UPDATE AspNetUsers
SET
    KoreanName = '윤나은',
    BirthDate = '1994-10-20',
    HireDate = '2024-05-08',
    Department = '클라이언트',
    Position = '개발',
    TotalAnnualLeave = 15,
    UsedAnnualLeave = 6,
    RewardLeave = 18.94,
    UsedRewardLeave = 0
WHERE Email = 'whalebaby1020@gmail.com';

-- 관리자 권한 부여 (이미 있으면 무시)
INSERT IGNORE INTO AspNetUserRoles (UserId, RoleId)
SELECT u.Id, r.Id
FROM AspNetUsers u
CROSS JOIN AspNetRoles r
WHERE u.Email = 'whalebaby1020@gmail.com' AND r.Name = 'Admin';

-- 확인용
SELECT Email, KoreanName, BirthDate, HireDate, Department, Position,
       TotalAnnualLeave, UsedAnnualLeave, RewardLeave, UsedRewardLeave
FROM AspNetUsers
WHERE Email = 'whalebaby1020@gmail.com';

SELECT u.Email, r.Name AS Role
FROM AspNetUserRoles ur
JOIN AspNetUsers u ON u.Id = ur.UserId
JOIN AspNetRoles r ON r.Id = ur.RoleId
WHERE u.Email = 'whalebaby1020@gmail.com';
