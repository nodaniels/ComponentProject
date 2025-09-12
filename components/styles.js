import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
  },
  button: {
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: 200,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  room: {
    fontSize: 18,
    padding: 10,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 5,
    width: 120,
    textAlign: 'center',
  },
  highlight: {
    backgroundColor: 'lightgreen',
    color: '#222',
    fontWeight: 'bold',
  },
  svgContainer: {
    marginTop: 30,
  },
});
