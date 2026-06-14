import QRCode from "qrcode";
const otpAuthUrl = process.argv[2];

if (!otpAuthUrl) {
  console.error("Please provide OTP auth url");
  process.exit(1);
}

async function main() {
  await QRCode.toFile("otp-qr.png", otpAuthUrl);
  console.log("QR code generated at otp-qr.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// for testing purpose you can use this url like

// npx ts-node scripts/otp-qr.ts "otpauth://totp/test-app?secret=ABCDEFGH&issuer=test-app"
