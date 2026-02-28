import { Button } from "@/components/ui/button"
import Window from "@/components/v2/window/Window"
import FeatureCard from "@/components/v2/ui/molecules/cards/feature-card/FeatureCard"
import Navbar from "@/components/v2/ui/molecules/navbar/Navbar"
import { ArrowUpRight } from "@/components/v2/ui/atoms/Icons/Icons"
import Footbar from "@/pages/layout/Footbar"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "@/auth/use-auth-hook";
import { useEffect } from "react"

const Home = () => {
    const { isAuthenticated,login,getToken } = useAuth();

    useEffect(() => {
        getToken()
    }, [getToken])
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (


        <div className="min-h-screen dark:text-white dark:selection:bg-cyan-500/40 overflow-x-hidden font-sans">
            <Navbar />
            <main className="flex flex-col p-10 items-left space-y-10 justify-center text-left">
                <div>
                    <p className="text-2xl font-semibold tracking-tight">
                        Buddhistai annotation Tool
                    </p>

                    <p className="text-medium text-zinc-400 max-w-2xl leading-tight">
                        An advanced platform for annotating and reviewing Tibetan texts with , parallel text editing, and comprehensive annotation tools.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-2 flex-wrap">
                    <Button variant="secondary" className="cursor-pointer" onClick={() => login(true)}>
                        Start Annotating
                    </Button>
                    <Button onClick={() => login(false)} variant="outline" asChild>
                            Login
                    </Button>
                    <Button variant="outline" asChild>
                        <a
                            href="https://buddhistai.tools"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-neutral-600"
                        >
                            buddhistai.tools
                        </a>
                    </Button>
                    <Button variant="outline" className="group">
                        <Link to="/help" className="text-neutral-400 hover:text-neutral-600 flex items-center gap-2">
                            View Walkthrough <span className="relative overflow-hidden h-fit w-fit">
                                <ArrowUpRight className="group-hover:-translate-y-5 group-hover:translate-x-5 duration-500 transition-transform " />
                                <ArrowUpRight className="absolute top-0 group-hover:translate-x-0 duration-500 group-hover:translate-y-0 transition-all translate-y-5 -translate-x-5 " />
                            </span>
                        </Link>
                    </Button>
                </div>
                <Window />
                <div id="features">
                    <FeatureCard />
                </div>
            </main >

            <Footbar />

        </div >
    );
}

export default Home;