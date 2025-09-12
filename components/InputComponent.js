import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
const InputComponent = () => {
    const [inputValue, setInputValue] = useState("");
    return (
        <View>
            <TextInput
                value={inputValue}
                onChangeText={(txt) => setInputValue(txt)}
                placeholder="Skriv noget her..."
                style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10, width: 200 }}
            />
            <Text>Du har skrevet: {inputValue}</Text>
        </View>
    )
}

export default InputComponent;
