import { SignupView } from "./signup-view";
export const metadata={title:"Tạo tài khoản"};
export default async function SignupPage({searchParams}:{searchParams:Promise<{type?:string}>}) {return <SignupView initialType={(await searchParams).type}/>;}
