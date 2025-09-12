import React from 'react';
import Svg, { Rect, Text } from 'react-native-svg';

const BuildingSvgComponent = ({ highlightRoom, width = 350, height = 120 }) => {
  // Bestem farve på rektangler baseret på highlightRoom
  const leftFill = highlightRoom === 'A.1.01' ? 'lightgreen' : '#D9D9D9';
  const rightFill = highlightRoom === 'B.2.01' ? 'lightgreen' : '#D9D9D9';

  return (
    <Svg width={width} height={height} viewBox="0 0 1807 607">
      <Rect width="1807" height="607" fill="#E5E5E5" />
      <Rect x="0.5" y="0.5" width="970" height="606" fill={leftFill} stroke="black" />
      <Rect x="971.5" y="0.5" width="835" height="606" fill={rightFill} stroke="black" />
      <Rect x="970.75" y="150.75" width="1.5" height="262.5" fill="#713131" stroke="#6C4646" strokeWidth="1.5" />
      <Rect x="0.75" y="150.75" width="1.5" height="262.5" fill="#713131" stroke="#6C4646" strokeWidth="1.5" />
      <Text x="300" y="100" fontSize="40" fill="#333">A.1.01</Text>
      <Text x="1400" y="100" fontSize="40" fill="#333">B.2.01</Text>
    </Svg>
  );
};

export default BuildingSvgComponent;
