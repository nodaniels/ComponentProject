import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BuildingSvgComponent = ({ highlightRoom, width = 350, height = 120, leftFill, rightFill }) => {
  const leftColor = leftFill || (highlightRoom === 'A.1.01' ? 'lightgreen' : '#D9D9D9');
  const rightColor = rightFill || (highlightRoom === 'B.2.01' ? 'lightgreen' : '#D9D9D9');
  
  return (
    <View style={[styles.container, { width, height }]}>
      <View style={[styles.leftRoom, { backgroundColor: leftColor }]}>
        <Text style={styles.roomText}>A.1.01</Text>
      </View>
      <View style={styles.divider} />
      <View style={[styles.rightRoom, { backgroundColor: rightColor }]}>
        <Text style={styles.roomText}>B.2.01</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: '#E5E5E5',
  },
  leftRoom: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: 'black',
  },
  rightRoom: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: 'black',
  },
  divider: {
    width: 2,
    backgroundColor: '#713131',
    borderColor: '#6C4646',
    borderWidth: 0.5,
  },
  roomText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default BuildingSvgComponent;
