import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import {
    AppConfig,
    UserSession,
    showConnect,
    openContractCall,
} from "@stacks/connect";
import {
    uintCV,
    stringUtf8CV,
    standardPrincipalCV,
    hexToCV,
    cvToHex,
    makeStandardSTXPostCondition,
    FungibleConditionCode,
    callReadOnlyFunction,
} from "@stacks/transactions";
import useInterval from "@use-it/interval";
import { StacksMocknet } from "@stacks/network";

export default function Home() {
    const appConfig = new AppConfig(["publish_data"]);
    const userSession = new UserSession({ appConfig });

    const [message, setMessage] = useState("");
    const [price, setPrice] = useState(5);
    const [supContractAddress, setSupContractAddress] = useState(
        "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    );
    const [supContractName, setSupContractName] = useState("sup");
    const [postedMessage, setPostedMessage] = useState("none");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState({});
    const [loggedIn, setLoggedIn] = useState(false);

    // Set up the network and API
    const network = new StacksMocknet();

    const handleMessageChange = (e) => {
        setMessage(e.target.value);
    };

    const handlePriceChange = (e) => {
        setPrice(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const functionArgs = [stringUtf8CV(message), uintCV(price * 1000000)];

        const postConditionAddress =
            userSession.loadUserData().profile.stxAddress.testnet;
        const postConditionCode = FungibleConditionCode.LessEqual;
        const postConditionAmount = price * 1000000;
        const postConditions = [
            makeStandardSTXPostCondition(
                postConditionAddress,
                postConditionCode,
                postConditionAmount
            ),
        ];

        const options = {
            contractAddress: supContractAddress,
            contractName: "sup",
            functionName: "write-sup",
            functionArgs,
            network,
            postConditions,
            appDetails: {
                name: "Sup",
                icon: "https://assets.website-files.com/618b0aafa4afde65f2fe38fe/618b0aafa4afde2ae1fe3a1f_icon-isotipo.svg",
            },
            onFinish: (data) => {
                console.log(data);
            },
        };

        await openContractCall(options);
    };

    const getMessage = useCallback(async () => {
        if (
            userSession &&
            userSession.isUserSignedIn() &&
            userSession.loadUserData()
        ) {
            const userAddress =
                userSession.loadUserData().profile.stxAddress.testnet;
            const clarityAddress = standardPrincipalCV(userAddress);
            const options = {
                contractAddress: supContractAddress,
                contractName: supContractName,
                functionName: "get-message",
                network,
                functionArgs: [clarityAddress],
                senderAddress: userAddress,
            };

            const result = await callReadOnlyFunction(options);
            if (result.value) {
                setPostedMessage(result.value.data);
            }
        }
    }, []);

    // Run the getMessage function at load to get the message from the contract
    useEffect(getMessage, [userSession]);

    // Poll the Stacks API every 30 seconds looking for changes
    useInterval(getMessage, 30000);

    function authenticate() {
        showConnect({
            appDetails: {
                name: "Sup",
                icon: "https://assets.website-files.com/618b0aafa4afde65f2fe38fe/618b0aafa4afde2ae1fe3a1f_icon-isotipo.svg",
            },
            redirectTo: "/",
            onFinish: () => {
                window.location.reload();
            },
            userSession,
        });
    }

    useEffect(() => {
        if (userSession.isSignInPending()) {
            userSession.handlePendingSignIn().then((userData) => {
                setUserData(userData);
            });
        } else if (userSession.isUserSignedIn()) {
            setLoggedIn(true);
            setUserData(userSession.loadUserData());
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <Head>
                <title>Sup</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
                <div className="flex flex-col w-full items-center justify-center">
                    <h1 className="text-6xl font-bold mb-24">Sup</h1>
                    {loggedIn ? (
                        <>
                            <form onSubmit={handleSubmit}>
                                <p>
                                    Say
                                    <input
                                        className="p-6 border rounded mx-2"
                                        type="text"
                                        value={message}
                                        onChange={handleMessageChange}
                                        placeholder="something"
                                    />
                                    for
                                    <input
                                        className="p-6 border rounded mx-2"
                                        type="number"
                                        value={price}
                                        onChange={handlePriceChange}
                                    />{" "}
                                    STX
                                </p>
                                <button
                                    type="submit"
                                    className="p-6 bg-green-500 text-white mt-8 rounded"
                                >
                                    Post Message
                                </button>
                            </form>
                            <div className="mt-12">
                                {postedMessage !== "none" ? (
                                    <p>You said "{postedMessage}"</p>
                                ) : (
                                    <p>You haven't posted anything yet.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <button
                            className="bg-white-500 hover:bg-gray-300 border-black border-2 font-bold py-2 px-4 rounded mb-6"
                            onClick={() => authenticate()}
                        >
                            Connect to Wallet
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
