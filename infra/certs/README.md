# MAX Russian CA certificates

Downloaded on: 2026-07-14

Official source:
- Installation page: https://www.gosuslugi.ru/crt
- Root CA PEM: https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt
- Sub CA PEM: https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt

These files contain public CA certificates only. They must not contain private keys.

## Russian Trusted Root CA

- File: `russian-trusted-root-ca.crt`
- Subject: `C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Root CA`
- Issuer: `C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Root CA`
- Serial: `1000`
- Valid from: `Mar  1 21:04:15 2022 GMT`
- Valid until: `Feb 27 21:04:15 2032 GMT`
- SHA-256 fingerprint: `D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31`

## Russian Trusted Sub CA

- File: `russian-trusted-sub-ca.crt`
- Subject: `C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Sub CA`
- Issuer: `C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Root CA`
- Serial: `1002`
- Valid from: `Mar  2 11:25:19 2022 GMT`
- Valid until: `Mar  6 11:25:19 2027 GMT`
- SHA-256 fingerprint: `BB:BD:E2:10:3E:79:0B:99:9E:C6:2B:D0:3C:F6:25:A5:A2:E7:C3:16:E1:0A:FE:6A:49:0E:ED:EA:D8:B3:FD:9B`

## Verification commands

```bash
openssl x509 -in infra/certs/russian-trusted-root-ca.crt -noout -subject -issuer -serial -dates -fingerprint -sha256
openssl x509 -in infra/certs/russian-trusted-sub-ca.crt -noout -subject -issuer -serial -dates -fingerprint -sha256
openssl verify -CAfile infra/certs/max-ca-bundle.pem infra/certs/russian-trusted-sub-ca.crt
grep -E "PRIVATE KEY" infra/certs/*.crt infra/certs/*.pem
```

Verify the live MAX TLS chain with the bundled CA certificates:

```bash
openssl s_client \
  -connect platform-api2.max.ru:443 \
  -servername platform-api2.max.ru \
  -CAfile infra/certs/max-ca-bundle.pem \
  -showcerts \
  -verify_return_error
```

Expected result:

```text
depth=2 C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Root CA
depth=1 C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Sub CA
depth=0 CN=*.max.ru, O=MAX LLC, C=RU, ST=77 Moscow, L=Moscow, street=Leningradskiy pr. 39 b.79, 1.2.643.100.4=9714058267, OGRN=1247700595230
Verify return code: 0 (ok)
```
