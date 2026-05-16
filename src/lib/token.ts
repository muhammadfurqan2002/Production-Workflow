import jwt from "jsonwebtoken";

export const createAccessToken=(userId:number,role:"USER"|"ADMIN",tokenVersion:number)=>{
    return jwt.sign({sub:userId,role,tokenVersion},process.env.JWT_ACCESS_TOKEN!,{expiresIn:"1d"});
}


export const createRefreshToken=(userId:number,tokenVersion:number)=>{
    return jwt.sign({sub:userId,tokenVersion},process.env.JWT_REFRESH_TOKEN!,{expiresIn:"7d"});
}
