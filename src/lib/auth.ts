import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; 
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { clientPromise } from "@/src/lib/db";
import { MongoClient, ObjectId } from "mongodb";
import { isSuperAdminEmail } from "@/lib/auth/roles";
import { atualizarFotoDoGoogle, fotoDoPerfil } from "@/lib/user/fotoNoLogin";
import { loginAssurance } from "@/lib/octa/android/access";

// A LISTA VIP
const ADMIN_EMAILS = [
    "zaeondao@gmail.com",
    "martinez@zaeon.space"
];

/** Skills iniciais do RPG acadêmico — mesmo shape do /api/auth/guest-register. */
const SKILLS_INICIAIS = {
    writing: { rank: "F", current: 0, next: 5, metricName: "Papers" },
    focus: { rank: "F", current: 0, next: 10, metricName: "Hours" },
    collab: { rank: "F", current: 0, next: 2, metricName: "Projects" },
    participation: { rank: "F", current: 0, next: 5, metricName: "Validations" },
};

/**
 * Provisiona a carteira custodial (Crossmint) e guarda o endereço no usuário.
 * Nunca lança: web3 não pode derrubar login. Usada pelos DOIS caminhos de entrada
 * (Google via events.createUser, e-mail via authorize).
 */
async function provisionarWallet(email: string, userId?: string | null): Promise<void> {
    try {
        const { ensureCustodialWallet } = await import("@/lib/solana/wallet");
        const { address, reason } = await ensureCustodialWallet(email);
        if (!address) {
            console.warn("[auth] wallet custodial nao provisionada:", reason);
            return;
        }
        const client = (await clientPromise) as MongoClient;
        const filter = userId && ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { email };
        await client.db().collection("users").updateOne(
            filter as any,
            { $set: { solanaWallet: address, solanaWalletAt: new Date() } },
        );
    } catch (e) {
        console.warn("[auth] falha ao provisionar wallet custodial:", e);
    }
}

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            checks: ['pkce', 'state'],
        }),
        
        // ── ENTRADA POR E-MAIL (sem senha, sem OAuth) ─────────────────────────
        // Um campo e pronto. Não depende de DNS, de console do Google nem de servidor
        // de e-mail — é o caminho que funciona sempre, inclusive pra testar em produção
        // enquanto o domínio novo sobe. Quem ainda não existe nasce aqui, com a mesma
        // "shadow account" do /api/auth/guest-register.
        //
        // Fundadores/admins NÃO entram por aqui, de propósito: sem senha, bastaria saber
        // o e-mail do dono pra virar dono. Essas contas entram pelo Google.
        CredentialsProvider({
            name: "E-mail",
            credentials: {
                email: { label: "Email", type: "text" }
            },
            async authorize(credentials) {
                const email = (credentials?.email || "").trim().toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
                if (ADMIN_EMAILS.includes(email) || isSuperAdminEmail(email)) return null;

                const client = (await clientPromise) as MongoClient;
                const db = client.db();
                const users = db.collection("users");

                const existing = await users.findOne({ email });
                if (existing) {
                    // 🔒 SEGURANCA: a lista de e-mails fechava so os donos conhecidos.
                    // Uma conta pode ter virado admin DEPOIS, pelo painel — e ai o login sem
                    // senha entrava nela. O papel gravado no banco e a fonte da verdade.
                    const papel = String(existing.role || "").toLowerCase();
                    if (papel === "super_admin" || papel === "admin") return null;

                    return {
                        id: existing._id.toString(),
                        name: existing.name,
                        email: existing.email,
                        // A imagem fica no banco — o cookie não carrega foto (ver jwt callback).
                        role: existing.role,
                    } as any;
                }

                // Conta nova: nome provisório vem do próprio e-mail; o onboarding refina depois.
                const agora = new Date();
                const doc = {
                    name: email.split("@")[0],
                    email,
                    emailVerified: null,
                    image: null,
                    role: "student",
                    kycStatus: "pending",
                    academicLevel: "Guest",
                    institution: "Guest",
                    skills: SKILLS_INICIAIS,
                    createdAt: agora,
                    updatedAt: agora,
                };
                const { insertedId } = await users.insertOne(doc as any);
                const id = insertedId.toString();

                // Carteira no 1º login, igual ao caminho do Google. Não bloqueia a entrada.
                await provisionarWallet(email, id);

                return { id, name: doc.name, email, role: doc.role } as any;
            }
        })
    ],
    session: { strategy: "jwt" },
    // Porta da frente própria: erro do OAuth volta pra /login?error=... em português,
    // em vez da tela genérica do NextAuth em inglês.
    pages: { signIn: "/login", error: "/login" },
    callbacks: {
        // CADASTRO ABERTO: qualquer conta Google entra e a conta nasce no mesmo login.
        // (O gate de convite — cookie convite_session → pending_registrations — saiu de
        // cena: a lista de espera virou onboarding, não porteiro. Ver PR do login v2.)
        async signIn({ user }) {
            return Boolean((user?.email || "").trim());
        },
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.reaIdentity = loginAssurance(account, profile);
                token.id = user.id;
                token.email = user.email;
                // @ts-ignore
                token.role = user.role || "student";
            }
            
            // 🔥 BLINDAGEM MÁXIMA: Garante que NENHUMA imagem entre no token,
            // nem do Google, nem de lugar nenhum. 
            // O cookie nunca passará de 1KB.
            delete token.picture;
            delete token.image;
            
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token.email) {
                const client = (await clientPromise) as MongoClient;
                const db = client.db();
                
                const dbUser = await db.collection("users").findOne({ email: token.email });
                
                if (dbUser) {
                    // Legacy/email-only sessions do not gain APK proof access. Only
                    // a fresh verified provider login can establish this JWT claim.
                    (session.user as any).id = dbUser._id.toString();
                    (session.user as any).reaIdentity = token.id === dbUser._id.toString() && token.reaIdentity === "google_verified" ? "google_verified" : "unverified";
                    session.user.name = dbUser.name || session.user.name;
                    // 🔥 Aqui nós pegamos a foto gigante DIRETO DO BANCO para mostrar na tela, 
                    // sem precisar trafegar ela no Cookie!
                    session.user.image = dbUser.image || null;
                    // @ts-ignore
                    session.user.role = dbUser.role || "student";
                    // @ts-ignore
                    session.user.course = dbUser.course || "";
                    // @ts-ignore
                    session.user.academicLevel = dbUser.academicLevel || "Graduação";
                    // @ts-ignore
                    session.user.gender = dbUser.gender || "unspecified";
                    
                    const userEmail = token.email.toLowerCase();
                    // @ts-ignore
                    session.user.isAdmin = ADMIN_EMAILS.includes(userEmail);
                }
            }
            return session;
        }
    },
    events: {
        // 1º LOGIN = 1ª CARTEIRA. Cria a wallet custodial (Crossmint, por e-mail) e guarda
        // em users.solanaWallet — sem seed phrase, sem extensão, sem gas: o aluno nem vê.
        // Assim a 1ª conquista já cunha na hora, em vez de esperar ele "criar uma wallet".
        // Sem CROSSMINT_SERVER_KEY ou com a API fora do ar, degrada em silêncio: o login
        // NUNCA quebra por causa de web3 (mesma filosofia de lib/solana/credentials.ts).
        async createUser({ user }) {
            const email = (user?.email || "").toLowerCase();
            if (!email) return;
            await provisionarWallet(email, user.id);
        },
        // #438: a cada login com o Google, a foto do Gmail atualiza na Zaeon (antes só no 1º login) — a não ser
        // que a pessoa tenha posto uma foto própria. Best-effort: nunca derruba o login (lib/user/fotoNoLogin.ts).
        async signIn({ user, account, profile }) {
            await atualizarFotoDoGoogle(
                { provider: account?.provider, email: user?.email, picture: fotoDoPerfil(profile) },
                {
                    lerFoto: async (email) => {
                        const db = ((await clientPromise) as MongoClient).db();
                        const u = await db.collection("users").findOne({ email }, { projection: { image: 1 } });
                        return typeof u?.image === "string" ? u.image : null;
                    },
                    salvarFoto: async (email, image) => {
                        const db = ((await clientPromise) as MongoClient).db();
                        await db.collection("users").updateOne({ email }, { $set: { image } });
                    },
                },
            );
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
