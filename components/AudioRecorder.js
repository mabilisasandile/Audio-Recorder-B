import React, { useState, useEffect } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet, Alert,
  TextInput, TouchableOpacity, Modal
} from 'react-native';
import { Card } from '@rneui/themed';
import { Audio } from 'expo-av';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStop, faMicrophone, faPlay, faPause, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigation } from "@react-navigation/native";



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

  const [current_user, setUser] = useState(null);
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
  const navigation = useNavigation();
  const BUCKET_NAME = "audio-recorder-67133.appspot.com";
  const PROJECT_ID = "audio-recorder-67133";
  const API_KEY = "AIzaSyBVxolW1kr1EUIk-j02yRX_wN4844N2JtY";

  console.log("User logged in:", user);
  console.log("User logged in ID:", user.uid);

  


  // retrieve the saved recordings from Firebase Storage/Firestore
  const getSavedAudios = async () => {
    
    try {
      const response = await axios.get(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${recordings}`);
      const savedRecordings = response.data.documents.map((doc) => {
        return {
          id: doc.name.split('/').pop(),
          ...doc.fields
        };
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
        const audioFileRef = `audio/${userId}/${audioTitle}`;
        const storageUrl = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(audioFileRef)}`;
        const storageResponse = await axios.post(storageUrl, {
          name: audioFileRef,
          contentType: 'audio/m4a',
        });

        // Get the download URL of the saved audio file
        const downloadUrl = storageResponse.data.mediaLink;

        // Save the audio metadata in Firestore
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/recordings`;
        const firestoreResponse = await axios.post(firestoreUrl, {
          fields: {
            userId: { stringValue: userId },
            title: { stringValue: audioTitle },
            duration: { stringValue: getDurationFormatted(status.durationMillis) },
            fileUrl: { stringValue: downloadUrl },
          },
        });

        // Retrieve the saved audio from Firestore and update the state
        const savedAudio = {
          id: firestoreResponse.data.name.split('/').pop(),
          title: audioTitle,
          duration: getDurationFormatted(status.durationMillis),
          fileUrl: downloadUrl,
        };
        setRecordings([...recordings, savedAudio]);

        // Reset the input fields
        setAudioTitle('');

        console.log("Status object properties:", status);

        // Show success message
        setMessage('Audio saved successfully.');
        Alert.alert('Success', 'Audio saved successfully.', [{ text: 'OK' }]);

      }
    } catch (error) {

      console.log(error);
      console.error(error);
      setErrorMessage("Failed to save audio!");
      Alert.alert('Error', 'Failed to save audio!.', [{ text: 'OK' }]);
    }
  }




  // update the title of a recording based on its ID in Firestore
  const updateAudioTitle = async (id, newTitle) => {
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/recordings/${id}`;
      await axios.patch(firestoreUrl, {
        fields: {
          title: { stringValue: newTitle },
        },
      });

      // Update the state with the updated title
      const updatedRecordings = recordings.map((recording) => {
        if (recording.id === id) {
          return { ...recording, title: newTitle };
        }
        return recording;
      });
      setRecordings(updatedRecordings);

      // Show success message
      Alert.alert('Success', 'Audio Title Updated.', [{ text: 'OK' }]);
    } catch (error) {
      console.log(error);
    }
  };




  // Delete a recording from Firestore and Storage
  const deleteRecording = async (id, audioName) => {
    try {
      // Delete the audio document from Firestore
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/recordings/${id}`;
      await axios.delete(firestoreUrl);

      // Delete the audio file from Storage
      const storageUrl = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(audioName)}`;
      await axios.delete(storageUrl);

      // Update the state by removing the deleted recording
      const updatedRecordings = recordings.filter((recording) => recording.id !== id);
      setRecordings(updatedRecordings);

      // Show success message
      Alert.alert('Success', 'Audio Deleted.', [{ text: 'OK' }]);
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to delete audio!', [{ text: 'OK' }]);
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

        <TouchableOpacity onPress={() => {
          deleteRecording(item.id, item.title);
          console.log("Audio id:", item.id);
          console.log("Audio title:", item.title);
        }}>
          <FontAwesomeIcon icon={faTrash} size={30} color='#000080' />
        </TouchableOpacity>
      </View>
    );
  };




  return (
    <View style={styles.container}>

      <Text style={styles.heading}>AUDIO RECORDER</Text>

      <Card containerStyle={{ marginTop: 15, marginBottom: 15, height: 300, width: 300, borderRadius: 10, backgroundColor: '#87ceeb', }}>
        <Card.Title>Record an audio here:</Card.Title>
        <Text style={{ color: 'green' }}>{message}</Text>
        <Text style={{ color: 'red' }}>{errorMessage}</Text>
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
          placeholder="Enter audio name"
          value={audioTitle}
          onChangeText={(text) => setAudioTitle(text)}
        />

        <TouchableOpacity onPress={stopRecording} style={styles.button}>
          <Text>Save Recording</Text>
        </TouchableOpacity>
      </Card>

      <Card containerStyle={{ marginTop: 15, marginBottom: 15, height: 300, width: 300, borderRadius: 10, backgroundColor: '#87ceeb', }}>
        <Card.Title>Recorded audios:</Card.Title>
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      </Card>
      <Button
        title="Log Out"
        onPress={handleLogOut}
        style={{ cursor: 'pointer', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, }}
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
    backgroundColor: '#1e90ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: 140,
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
