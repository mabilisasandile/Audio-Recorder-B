
import React, { useState, useEffect } from "react";
import { auth } from "../config/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { Text, View, TextInput, Alert, Button, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";



const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation();
    const [resetEmail, setResetEmail] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const PROJECT_ID = "audio-recorder-67133";
    const API_KEY = "AIzaSyBVxolW1kr1EUIk-j02yRX_wN4844N2JtY";



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const uid = user.uid;
                navigation.navigate('Home')
            } else {
                console.log('User is signed out')
            }
        })
        return unsubscribe
    }, [])



    const handleSignin = (() => {

        // // Replace the signInWithEmailAndPassword function with the appropriate REST API endpoint
        // fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {         //https://PROJECT_ID.firebaseapp.com/signin
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         email: email,
        //         password: password,
        //     }),
        // })
        //     .then(response => response.json())
        //     .then(data => {
        //         if (data.success) {
        //             // Handle successful sign in
        //             Alert.alert("Success", "Signed In Successfully.", [{ text: "OK" }]);
        //             navigation.navigate("Home"); // Navigate to the home screen
        //         } else {
        //             // Handle sign in error
        //             Alert.alert("Error", "Failed to sign in. Invalid Username/Password!", [{ text: "OK" }]);
        //             console.log(data.error);
        //         }
        //     })
        //     .catch(error => {
        //         console.log(error);
        //     });

            //-----------------------------------------------------

        signInWithEmailAndPassword(auth, email, password).then(() => {

            // Handle successful signin
            Alert.alert("Success", "Signed In Successfully.", [{ text: "OK" }]);
            navigation.navigate("Home"); // Navigate to the AudioRecorder screen

        }).catch((error) => {

            // Handle sign in error
            Alert.alert("Error", "Failed to sign in. Invalid Username/Password!", [{ text: "OK" }]);
            console.log(error);
        })

    })



    const handleLinkClick = () => {
        navigation.navigate('Register');
    };


    const resetPassword = () => {
        setShowResetPassword(true);
    };

    const handleResetPassword = () => {

        fetch('https://PROJECT_ID.firebaseapp.com/resetpassword', {  //https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=[API_KEY]
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: resetEmail,
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Handle successful password reset
                    Alert.alert("Success", "Password reset email sent.", [{ text: "OK" }]);
                } else {
                    // Handle password reset error
                    Alert.alert("Error", "Failed to reset password. Invalid Email!", [{ text: "OK" }]);
                    console.log(data.error);
                }
            })
            .catch(error => {
                console.log(error);
            });
    };



    return (

        <View style={styles.container}>

            <Card style={styles.card}>
                <Card.Title title="Sign In Page" subtitle="Enter your credentials to sign in!" />
                <Card.Content>
                    <TextInput
                        placeholder="Username/Email"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.inputs}
                    />
                    <TextInput
                        placeholder="Password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={styles.inputs}
                    />
                </Card.Content>

                <Card.Actions>
                    <TouchableOpacity onPress={handleSignin} style={styles.button}>
                        <Text>Sign In</Text>
                    </TouchableOpacity>
                </Card.Actions>

                <Card.Actions>
                    <TouchableOpacity style={styles.nav_link} onPress={handleLinkClick}>
                        <Text>No account? Sign Up Now </Text>
                    </TouchableOpacity>
                </Card.Actions>


                <Card.Actions>
                    <TouchableOpacity style={styles.nav_link} onPress={resetPassword}>
                        <Text>Forgot Password?</Text>
                    </TouchableOpacity>
                </Card.Actions>

                {showResetPassword && (
                    <Card.Actions>
                        <TextInput
                            placeholder="Enter email to reset password"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            style={styles.inputs}
                        />
                        <TouchableOpacity style={styles.reset} onPress={handleResetPassword}>
                            <Text>Reset</Text>
                        </TouchableOpacity>
                    </Card.Actions>

                )}

            </Card>

        </View>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        height: 600,
        width: 300,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#c0c0c0',
    },
    card: {
        marginTop: 15,
        marginBottom: 15,
        height: 500,
        width: 300,
        backgroundColor: '#87ceeb',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#ffffff',
    },
    text: {
        fontSize: 18,
        marginBottom: 20,
        color: "#FFFFFF",
    },
    button: {
        backgroundColor: '#1e90ff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        width: 150,
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    nav_link: {
        backgroundColor: '#87ceeb',
        paddingHorizontal: 5,
        width: 200,
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    reset: {
        fontSize: 24,
        fontWeight: 'bold',
        backgroundColor: '#00fa9a',
    },
    inputs: {
        width: 250,
        height: 30,
        backgroundColor: '#fffafa',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        marginTop: 20,
        marginBottom: 20,
    },
    inputEdit: {
        width: 100,
        height: 30,
        backgroundColor: '#fffafa',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        marginTop: 20,
        marginBottom: 20,
    },
    labels: {
        color: "#FFFFFF",
    },
});

export default SignIn;