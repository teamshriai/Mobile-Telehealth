# Portrait credits

The portraits in this folder are **AI-generated images of people who do not exist**. They are used only on the SHRI HEALTH demo accounts: the fictional doctors and the two demo patients.

- **Made with:** [FLUX.1 [schnell]](https://huggingface.co/black-forest-labs/FLUX.1-schnell) by Black Forest Labs, released under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). They were generated through the community [AI Horde](https://aihorde.net) and the model's public Hugging Face Space.
- **Brief:** typical South Indian faces, natural and unretouched, framed head-and-shoulders (not tight on the face), against a plain light-grey wall in soft daylight.
- **Changes made:** each image was cropped to a square that keeps the head and shoulders, resized to 320 × 320, and saved as WebP.

| File | Used for | Described in the prompt as |
|---|---|---|
| `doctors/priya-nair.webp` | Dr Priya Nair (demo) | Malayali woman doctor from Kerala, about 42 |
| `doctors/ananya-iyer.webp` | Dr Ananya Iyer (demo) | Tamil woman doctor from Chennai, about 40 |
| `doctors/kavitha-rao.webp` | Dr Kavitha Rao (demo) | young Kannadiga woman doctor from Mangaluru, about 28 |
| `doctors/karthik-raja.webp` | Dr Karthik Raja (demo) | Tamil man doctor from Madurai, about 38 |
| `doctors/anitha-selvam.webp` | Dr Anitha Selvam, physiotherapist (demo) | Tamil woman physiotherapist from Coimbatore, about 33 |
| `doctors/rohit-desai.webp` | Dr Rohit Desai (demo) | Kannadiga man doctor from Dharwad, about 46 |
| `doctors/senthil-kumar.webp` | Dr Senthil Kumar, speech therapist (demo) | Tamil man speech therapist from Chennai, about 31 |
| `patients/meenakshi-subramaniam.webp` | Meenakshi Subramaniam (demo patient) | Tamil woman from Coimbatore, 56 |
| `patients/meera-krishnan.webp` | Meera Krishnan (demo patient) | South Indian woman from Bengaluru, 34 |

**Before a real launch,** replace these with each clinician's own photo, taken with their consent. The server only ever sends a portrait path that matches `doctors/<slug>.webp` or `patients/<slug>.webp` (see `server/src/utils/avatarUrl.ts`). `server/prisma/scripts/demo-avatars.ts` sets the demo keys.
