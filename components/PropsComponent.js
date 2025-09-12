import React from 'react';
import { Text, View } from 'react-native';
const PropsComponent = ({ name }) => {
    return (
        <View>
            <Text>Made by {name}</Text>
        </View>
    );
}
export default PropsComponent;
