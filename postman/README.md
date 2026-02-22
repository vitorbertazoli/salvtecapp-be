# Postman Data Leak Test (Cross-Account Isolation)

## Files
- `account-data-isolation.collection.json`
- `account-data-isolation.environment.json`

## What this validates
1. Create Account A
2. Activate Account A (via master-admin endpoint)
3. Login as Account A user
4. Create customer data in Account A
5. Create Account B
6. Activate Account B
7. Login as Account B user
8. Assert Account A customer is **not** visible from Account B
9. Assert direct read by ID with Account B token does not return Account A customer

## How to run
1. Import both files into Postman.
2. Select environment **Salvtec BE - Data Isolation**.
3. Set:
   - `baseUrl` (default `http://localhost:3000`)
   - `masterAdminEmail`
   - `masterAdminPassword`
4. Run the whole collection in order.

## Expected result
- Requests `09` and `10` should pass with no leak.
- Any failure in those assertions indicates possible cross-account data exposure.

## If you cannot use master-admin activation
New accounts are created with `pending` status and cannot log in until activation.
If you do not have a master-admin user/token, activate each created account manually before login (for example through your existing verification flow), then continue from request `03` and `08`.
