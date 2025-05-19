// components/ModalConfirmacion.js
import React from 'react';
import { View, Text, Modal, TextInput, Button, StyleSheet } from 'react-native';

const ModalConfirmacion = ({
  visible,
  setVisible,
  confirmPassword,
  setConfirmPassword,
  onConfirm,
  titulo = '¿Estás seguro que deseas continuar?'
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{titulo}</Text>

          <TextInput
            placeholder="Confirma tu contraseña"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Button title="Confirmar" onPress={onConfirm} />
          <View style={{ marginTop: 10 }}>
            <Button
              title="Cancelar"
              onPress={() => {
                setVisible(false);
                setConfirmPassword('');
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 10
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5
  }
});

export default ModalConfirmacion;
