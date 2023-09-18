
import React, { useState } from "react";
import { auth } from "../config/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
// import { useState } from "react";
import { Text, View, TextInput, Alert, Button, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";


const SignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation();

    const handleSignup = (() => {
        createUserWithEmailAndPassword(auth, email, password).then(() => {

            // Handle successful signup
            Alert.alert("Success", "Signed Up Successfully.", [{ text: "OK" }]);
            console.log("Signed Up Successfully.");
            navigation.navigate('SignIn');

        }).catch((error) => {

            // Handle signup error
            Alert.alert("Error", "Failed to sign up!", [{ text: "OK" }]);
            console.log("Failed to sign up!", error);
            
        })
    })



    const handleLinkClick = () => {
        navigation.navigate('SignIn');
    };



    return (

        <View>
            
            <Card style={styles.card}>
                <Card.Title title="Sign Up" subtitle="Enter Email and Password to sign up" />
                <Card.Content>
                    <TextInput
                        placeholder="Email"
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
                    <TouchableOpacity onPress={handleSignup} style={styles.button}>
                     <Text>Sign Up</Text>
                    </TouchableOpacity>
                </Card.Actions>
                <Card.Actions>
                    <TouchableOpacity style={styles.nav_link} onPress={handleLinkClick}>
                        <Text>Already have an acoount? Sign in </Text>
                    </TouchableOpacity>
                </Card.Actions>
            </Card>

        </View>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#191970',
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
        color: 'black',
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
        borderRadius: 10,
        width: 200,
        shadowColor: 'black',
        color: '#fff',
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

export default SignUp;