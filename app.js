import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
                <WebView
                    source={{ uri: 'https://phonetransfer.app/app/index.html' }}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    allowsInlineMediaPlayback={true}
                    allowsBackForwardNavigationGestures={true}
                />
            </SafeAreaView>
        </>
    );
}
