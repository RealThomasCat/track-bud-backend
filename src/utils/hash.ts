import bcrypt from "bcryptjs";

// Hashes plain password before saving to DB
export const hashPassword = async (password: string) => {
    // Generate salt (10 rounds by default)
    const salt = await bcrypt.genSalt(10);

    // Return hashed password
    return bcrypt.hash(password, salt);
};

// Compares a plain password with the hashed one from DB
export const comparePassword = (password: string, hashed: string) => {
    return bcrypt.compare(password, hashed);
};
