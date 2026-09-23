import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoleName } from '@prisma/client';
import { Permission, permissionsForRole, roleHasPermission } from '../../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// The capability model.
//
// ⚠️ UI_ATLAS §3.2 freezes three rules, and these tests hold the first:
// "no authorization check compares a role name". The Resident role behaves
// differently from Doctor ENTIRELY because of which capabilities it lacks —
// so the derivation itself is what is asserted here, not the behaviour of any
// one endpoint.
// ─────────────────────────────────────────────────────────────────────────────

describe('Resident is Doctor minus the attestation capabilities', () => {
  const doctor = permissionsForRole(RoleName.Doctor);
  const resident = permissionsForRole(RoleName.Resident);

  it('may author a note but may not attest to it alone', () => {
    assert.equal(roleHasPermission(RoleName.Resident, Permission.NoteWriteAssigned), true);
    assert.equal(roleHasPermission(RoleName.Resident, Permission.NoteSignOwn), false);
  });

  it('may draft a prescription but may not sign one', () => {
    assert.equal(roleHasPermission(RoleName.Resident, Permission.RxWriteAssigned), true);
    assert.equal(roleHasPermission(RoleName.Resident, Permission.RxSignOwn), false);
  });

  it('may not override a deterministic hard stop', () => {
    // A G4 override needs two consultants. A resident is not one of them.
    assert.equal(roleHasPermission(RoleName.Resident, Permission.RxOverrideHardStop), false);
  });

  it('may not counter-sign anyone, including another resident', () => {
    assert.equal(roleHasPermission(RoleName.Resident, Permission.NoteCosignAssigned), false);
  });

  it('is a strict subset of Doctor — never grants something Doctor lacks', () => {
    const extra = resident.filter((p) => !doctor.includes(p));
    assert.deepEqual(extra, [], 'Resident must not hold a capability Doctor does not');
  });

  it('withholds exactly the five attestation capabilities and no others', () => {
    const withheld = [...doctor.filter((p) => !resident.includes(p))].sort();
    const expected = [
      Permission.NoteCosignAssigned,
      Permission.NoteSignOwn,
      Permission.RxOverrideHardStop,
      Permission.RxSignOwn,
      Permission.TemplateManageOwn,
    ].sort();
    assert.deepEqual(withheld, expected);
  });
});

describe('Consultant capabilities', () => {
  it('a Doctor can counter-sign, sign and override', () => {
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.NoteCosignAssigned), true);
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.NoteSignOwn), true);
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.RxSignOwn), true);
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.RxOverrideHardStop), true);
  });

  it('a Doctor may request break-glass but may not review it', () => {
    // Reviewing your own emergency access is not review.
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.BreakGlassRequest), true);
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.BreakGlassReview), false);
  });

  it('a Doctor still cannot read any patient unconditionally', () => {
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.PatientReadAny), false);
  });
});

describe('Break-glass review is separated from clinical access', () => {
  it('Admin reviews emergency access but holds no clinical read at all', () => {
    // ⚠️ Auditing THAT an access happened must not require the auditor to be
    // able to read what was accessed.
    assert.equal(roleHasPermission(RoleName.Admin, Permission.BreakGlassReview), true);
    assert.equal(roleHasPermission(RoleName.Admin, Permission.PatientReadAssigned), false);
    assert.equal(roleHasPermission(RoleName.Admin, Permission.NoteReadAssigned), false);
  });

  it('Admin cannot grant themselves emergency access', () => {
    assert.equal(roleHasPermission(RoleName.Admin, Permission.BreakGlassRequest), false);
  });
});

describe('Template governance is a separate persona', () => {
  it('a clinician authors templates but cannot promote one facility-wide', () => {
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.TemplateManageOwn), true);
    assert.equal(roleHasPermission(RoleName.Doctor, Permission.TemplatePromoteFacility), false);
  });

  it('a hospital administrator promotes but does not author clinically', () => {
    assert.equal(
      roleHasPermission(RoleName.HospitalAdmin, Permission.TemplatePromoteFacility),
      true,
    );
    assert.equal(roleHasPermission(RoleName.HospitalAdmin, Permission.NoteWriteAssigned), false);
  });
});

describe('Every role resolves to a capability list', () => {
  it('has no role that falls through to an empty list', () => {
    for (const role of Object.values(RoleName)) {
      assert.ok(
        permissionsForRole(role).length > 0,
        `${role} resolves to an empty capability list`,
      );
    }
  });
});
