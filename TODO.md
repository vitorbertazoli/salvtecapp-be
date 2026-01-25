# Back-End TODO List

## User Profile Feature

- [ ] Update User entity/model to include profile picture field (if not already present)
- [ ] Create DTOs for user profile updates (e.g., UpdateProfileDto)
- [ ] Create DTO for password change (e.g., ChangePasswordDto)
- [ ] Implement GET /users/profile endpoint to retrieve current user's profile data
- [ ] Implement PUT /users/profile endpoint to update user profile information
- [ ] Implement PUT /users/change-password endpoint to change user password
- [ ] Implement POST /users/upload-profile-picture endpoint for profile picture upload
- [ ] Add file upload handling (multer or similar) for profile pictures
- [ ] Add validation pipes for all DTOs
- [ ] Ensure proper authentication guards on all profile endpoints
- [ ] Add authorization checks to ensure users can only modify their own profile
- [ ] Implement profile picture storage (local file system or cloud storage like AWS S3)
- [ ] Add image processing/resizing for profile pictures if needed
- [ ] Update user service methods to handle profile operations
- [ ] Add error handling and appropriate HTTP status codes
- [ ] Write unit tests for new endpoints and services
- [ ] Update API documentation (Swagger/OpenAPI) for new endpoints
- [ ] Implement rate limiting for password change endpoint to prevent abuse
- [ ] Add logging for profile changes for security auditing

## General Back-End Improvements

- [ ] Review and optimize database queries
- [ ] Add more comprehensive error handling
- [ ] Implement caching where appropriate
- [ ] Add API versioning if not already implemented
- [ ] Review and update dependencies
- [ ] Add integration tests
- [ ] Implement health checks
- [ ] Add monitoring and metrics