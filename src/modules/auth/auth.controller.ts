import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema";
import {comparePassword, hashPassword} from "../../lib/hash";
import jwt from "jsonwebtoken";
import {sendEmail} from "../../lib/email";
import {createAccessToken, createRefreshToken} from "../../lib/token";
import prisma from "../../config/db";


function getAppUrl() {
    return process.env.APP_URL || `http://localhost:${process.env.PORT}`;
}


export async function registerHandler(req: Request, res: Response) {
    try {
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ message: "Invalid data!", error: result.error.flatten });
        }

        const { email, password, name } = result.data;
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" })
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword
            }
        });
        const verificationToken = jwt.sign({
            sub: user.id,
        }, process.env.JWT_ACCESS_TOKEN!,
            {
                expiresIn: "1d"
            });

        const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${verificationToken}`;

        await sendEmail(user.email, "Verify your email", `
        <p>Please verify your email using this link: <a href='${verifyUrl}'>Verify email</a></p>
        `)

        return res.status(201).json({
            message: "User registered successfully", user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isEmailVerified: user.isEmailVerified,
                role: user.role,
            }
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" })

    }
}

export async function verifyEmail(req: Request, res: Response) {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        const decode=jwt.verify(token as string,process.env.JWT_ACCESS_TOKEN!) as {
            sub:string;
        };
        const user=await prisma.user.findUnique({
            where:{id:Number(decode.sub)}
        })
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        if(user.isEmailVerified){
            return res.status(400).json({message:"Email already verified"});
        }
        await prisma.user.update({
            where:{id:user.id},
            data:{isEmailVerified:true,updatedAt:new Date()}
        })
        return res.status(200).json({message:"Email verified successfully"})


    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const loginHandler=async(req:Request,res:Response)=>{
    try{
        const result=loginSchema.safeParse(req.body);
        if(!result.success){
            return res.status(400).json({ message: "Invalid data!", error: result.error.flatten });
        }
        const{email,password}=result.data;
        const normalizedEmail=email.trim().toLowerCase();
        const user=await prisma.user.findUnique({
            where:{email:normalizedEmail}
        })
        if(!user){
            return res.status(401).json({message:"User not found"});
        }
        const isPasswordValid=await comparePassword(password,user.password);
        if(!isPasswordValid){
            return res.status(400).json({message:"Invalid password"});
        }

        if(!user.isEmailVerified){
            return res.status(403).json({message:"Please verify your email!"});
        }

        const accessToken=createAccessToken(Number(user.id),user.role,user.tokenVersion);
        const refreshToken=createRefreshToken(Number(user.id),user.tokenVersion);
        
        const isProd=process.env.NODE_ENV==="production";
        res.cookie("refreshToken",refreshToken,{
            httpOnly:true,
            secure:isProd,
            sameSite:"lax",
            maxAge:60*60*24*7
        });

        return res.status(200).json({
            message:"Login successful",
            user:{
                id:user.id,
                email:user.email,
                name:user.name,
                role:user.role,
                isEmailVerified:user.isEmailVerified,
                twoFactorEnabled:user.twoFactorEnabled
            },
            accessToken
        });
        
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "Internal server error" })
    }
}