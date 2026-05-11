# Security Specification for Mentorship App

## Data Invariants
1. A Student must always belong to the mentor who created it.
2. An Interaction must always be linked to a valid Student belonging to the current mentor.
3. Templates must be owned by the mentor.
4. Users can only see and modify their own data (unless they are an admin).

## Identity Invariants
- `mentorId` must always match `request.auth.uid`.
- `role` can only be set to `admin` by an existing admin.

## The "Dirty Dozen" Payloads (Attacks)

1. **Identity Spoofing**: Create a student with someone else's `mentorId`.
2. **Privilege Escalation**: Update own profile to set `role: 'admin'`.
3. **Data Theft**: Read students or interactions belonging to another mentor.
4. **Malicious Update**: Update a student's `mentorId` to "steal" they from another mentor.
5. **Orphaned Record**: Create an interaction for a non-existent student.
6. **Denial of Wallet**: Create a student with a 1MB string in the `name` field.
7. **Resource Poisoning**: Create a student with an invalid ID like `../../../etc/passwd`.
8. **Unauthorized Deletion**: Delete a student as a different mentor.
9. **Bypassing Validation**: Create a student without the `name` field.
10. **State Corruption**: Manually set `lastContactDate` in the past during a create operation.
11. **Shadow Field**: Add `isVerified: true` to a student record.
12. **Bulk Leak**: Querying all students without filter (attempting to bypass mentorId check in rules).

## Test Runner Logic

The rules must reject all the above.

1. `allow create: if isValidStudent(incoming())` -> Rejects #1, #6, #9, #11.
2. `allow update: if isOwner() && affectedKeys().hasOnly([...])` -> Rejects #2, #4.
3. `allow read: if resource.data.mentorId == request.auth.uid` -> Rejects #3, #12.
4. `isValidId()` check on paths -> Rejects #7.
5. `allow delete: if isOwner()` -> Rejects #8.
