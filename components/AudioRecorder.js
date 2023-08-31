import React, { useState, useEffect } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet, Alert,
  TextInput, TouchableOpacity, Modal
} from 'react-native';
import { Card } from '@rneui/themed';
import { Audio } from 'expo-av';
// import { ref } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStop, faMicrophone, faPlay, faPause, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, where } from "firebase/firestore";
import { db, storage, auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDownloadURL, uploadBytes, ref } from 'firebase/storage';
import { useNavigation } from "@react-navigation/native";
// import { object } from 'module';


const recordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};



export default function AudioRecorder() {

  // const [user, setUser] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [recording, setRecording] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [modalVisible, setModalVisible] = useState(false);



  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }, []);



  useEffect(() => {
    getSavedAudios();
  }, []);


  const user = auth.currentUser;
  console.log("User logged in:", user);

  const navigation = useNavigation();


  // retrieve the saved recordings from Firebase Storage/Firestore
  const getSavedAudios = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "recordings"), where('userId', '==', user.uid));

      const savedRecordings = [];

      querySnapshot.forEach((doc) => {
        savedRecordings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setRecordings(savedRecordings);

      console.log("Saved Recordings:", savedRecordings);

    } catch (error) {
      console.log("Failed to fetch saved audios", error);
    }
  };




  // request permission to access the microphone and start recording
  const startRecording = async () => {

    if (!user) {
      setMessage('Please sign in to start recording.');
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          recordingOptions
        );
        setRecording(recording);
      } else {
        setMessage("Please grant permission to app to access microphone");
        setErrorMessage(message);
      }

    } catch (error) {
      console.log("Failed to start recording", error);
      setErrorMessage("Failed to start recording!", error);
    }
  };



  // stop the active recording and save recorded audio
  const stopRecording = async () => {
    try {
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync(
        {
          allowsRecordingIOS: false,
        }
      )

      const getURI = recording.getURI();

      // let recordingsArray = [...recordings];
      const { sound, status } = await recording.createNewLoadedSoundAsync();

      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          try {
            resolve(xhr.response);
          } catch (error) {
            console.log("error:", error);
          }
        };
        xhr.onerror = (e) => {
          console.log(e);
          reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", getURI, true);
        xhr.send(null);
      });

      if (blob != null) {
        const userId = user.uid; // Get the signed-in user's ID

        // Save the audio file under the signed-in user's ID in Firebase Storage
        const audioFileRef = ref(storage, `audio/${userId}/${audioTitle}`);
        const upload = uploadBytes(audioFileRef, blob).then(() => {
          getDownloadURL(audioFileRef).then(async (url) => {
            await addDoc(collection(db, 'recordings'), {
              userId: userId,
              title: audioTitle,
              duration: getDurationFormatted(status.durationMillis),
              fileURL: url,
              // sound: sound,
              file: getURI,
            })
          })
        })

        let updatedRecordings = [
          ...recordings,
          {
            title: audioTitle,
            duration: getDurationFormatted(status.durationMillis),
            // fileURL: url,
            sound: sound,
            file: getURI,
          }
        ];


        // updatedRecordings.push(newRecording);
        setRecordings(updatedRecordings);
        setRecording(null);
        setAudioTitle('');
        Alert.alert('Success', 'Audio saved successfully.', [{ text: 'OK' }]);
      }
    } catch (error) {

      console.log(error);
      console.error(error);
      setErrorMessage("Failed to save audio!");
      Alert.alert('Error', 'Failed to save audio!.', [{ text: 'OK' }]);
    }

  }




  //Get the duration
  function getDurationFormatted(millis) {

    if (isNaN(millis)) {
      return "Invalid duration";
    }

    const minutes = millis / 1000 / 60;
    const minutesDisplay = Math.floor(minutes);
    const seconds = Math.round((minutes - minutesDisplay) * 60);
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutesDisplay}:${secondsDisplay}`;
  }



  // update the title of a recording based on its ID in Firebase Storage/Firestore
  const updateAudioTitle = async (id, editTitle) => {
    try {
      const audioData = doc(db, "recordings", id);

      await updateDoc(audioData, {
        title: editTitle
      });

      // Update the audio title on Firebase Storage
      const audioRef = ref(storage, `audio/${id}`);
      await updateMetadata(audioRef, {
        customMetadata: {
          title: editTitle
        }
      });

      const updatedRecordings = recordings.map((recording) => {
        if (recording.id === id) {
          return { ...recording, title: editTitle };
        }
        return recording;
      });

      setRecordings(updatedRecordings);

      Alert.alert('Success', 'Audio Title Updated.', [{ text: 'OK' }]);

    } catch (error) {
      console.log(error);
    }
  };




  // Remove a recording from Firebase Storage/Firestore based on its ID.
  const deleteRecording = async (id) => {
    try {

      const audioData = doc(db, "recordings", id);

      await deleteDoc(audioData);

      const updatedRecordings = recordings.filter((recording) => recording.id !== id);

      setRecordings(updatedRecordings);

      Alert.alert("Success", "Audio Deleted...", [{ text: "OK" }]);

    } catch (error) {

      console.log(error);
      Alert.alert("Error", "Failed to delete audio!", [{ text: "OK" }]);
    }
  };


  //Close the Modal after editing
  const handleClose = () => {
    setModalVisible(false);
  }


  //Log out function
  const handleLogOut = () => {
    signOut(auth)
      .then(() => {
        // Handle successful log out
        navigation.navigate('SignIn')
        console.log("User logged out");
      })
      .catch((error) => {
        // Handle log out error
        console.log(error);
        console.error(error);
        setErrorMessage("Failed to sign out!");
        Alert.alert('Error', 'Failed to sign out!.', [{ text: 'OK' }]);
      });
  };



  // render each recording item in the FlatList component
  const renderItem = ({ item, index }) => {

    const renderEditSection = () => {
      if (editId === item.id) {

        console.log("Edit item id:", item.id);
        return (
          <>
            <Modal visible={modalVisible} animationType="slide" onRequestClose={handleClose}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: 'white', padding: 20 }}>
                  <Text>Change your audio title name here!</Text>
                  <TextInput
                    style={styles.inputEdit}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    onBlur={() => updateAudioTitle(item.id, editTitle)}
                  />
                  <Button
                    style={styles.button}
                    title="Save"
                    onPress={() => updateAudioTitle(item.id, editTitle)}
                  />
                  <Button
                    style={styles.button}
                    title="Close"
                    onPress={handleClose} />
                </View>
              </View>
            </Modal>
          </>
        );
      } else {
        return null;
      }
    };

    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
        <TouchableOpacity onPress={() => {
          if (item.isPlaying) {
            item.sound.pauseAsync();
          } else {
            item.sound.replayAsync();
          }
        }}>
          <FontAwesomeIcon icon={item.isPlaying ? faPause : faPlay} size={30} color="#000080" />
        </TouchableOpacity>

        <Text>{index + 1} - {item.title} - {item.duration}</Text>

        {renderEditSection()}

        <TouchableOpacity onPress={() => {
          setEditId(item.id);
          setEditTitle(item.title);
          setModalVisible(true);
          console.log("Selected audio id:", item.id);
          console.log("Selected audio title:", item.title);
          console.log("Selected audio index:", index);
        }}>
          <FontAwesomeIcon icon={faEdit} size={30} color='#000080' />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => deleteRecording(item.id)}>
          <FontAwesomeIcon icon={faTrash} size={30} color='#000080' />
        </TouchableOpacity>
      </View>
    );
  };




  return (
    <View style={styles.container}>

      <Text style={styles.heading}>Audio Recorder</Text>

      <Card containerStyle={{ marginTop: 15, marginBottom: 15, height: 300, width: 300, borderRadius: 10, backgroundColor: '#87ceeb', }}>
        <Card.Title>RECORD AUDIO</Card.Title>
        {/* <Card.Divider /> */}
        <Text>{errorMessage}</Text>
        {recording ? (
          <TouchableOpacity onPress={stopRecording}>
            <FontAwesomeIcon icon={faStop} size={30} color="red" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startRecording}>
            <FontAwesomeIcon icon={faMicrophone} size={30} color="black" />
          </TouchableOpacity>
        )}
        {recording && <Text>Recording...</Text>}
        <TextInput
          style={styles.inputs}
          placeholder="Enter Audio Title"
          value={audioTitle}
          onChangeText={(text) => setAudioTitle(text)}
        />
        <Button
          style={styles.button}
          title="Save Recording"
          onPress={stopRecording}
        />
      </Card>

      <Card containerStyle={{ marginTop: 15, marginBottom: 15, height: 300, width: 300, borderRadius: 10, backgroundColor: '#87ceeb', }}>
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      </Card>
      <Button
        title="Log Out"
        onPress={handleLogOut}
        style={{cursor: 'pointer', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,}}
      />
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
    width: 400,
  },
  card: {
    marginTop: 15,
    marginBottom: 15,
    height: 350,
    width: 300,
    backgroundColor: '#87ceeb',
    borderRadius: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
    color: "#FFFFFF",
  },
  button: {
    backgroundColor: '#f4511e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: 200,
    shadowColor: 'black',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
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
})
