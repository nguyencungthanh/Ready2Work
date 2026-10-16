import { SigninView } from "./signin-view";
export const metadata={title:"Đăng nhập"};
export default async function SigninPage({searchParams}:{searchParams:Promise<{next?:string;error?:string}>}){return <SigninView {...await searchParams}/>;}
