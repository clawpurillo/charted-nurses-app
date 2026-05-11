# Create a dummy audio file for testing
with open('/tmp/test_audio.webm', 'wb') as f:
    # Minimal WebM header (not valid audio but has correct magic bytes)
    f.write(b'\x1a\x45\xdf\xa3')  # WebM EBML magic
    f.write(b'\x00' * 256)  # padding
print('Created dummy audio file')
