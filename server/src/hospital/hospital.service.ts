import { hospitalRepository } from './hospital.repository';

export const hospitalService = {
  async listActive() {
    return hospitalRepository.listActive();
  },
};
