import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            // Passa o ID do usuário para a sessão (útil para o MongoDB)
            if (session?.user) {
                // @ts-ignore
                session.user.id = token.sub;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET, // Obrigatório em produção
});

export { handler as GET, handler as POST };