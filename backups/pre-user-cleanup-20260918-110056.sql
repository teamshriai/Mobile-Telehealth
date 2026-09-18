--
-- PostgreSQL database dump
--

\restrict ICrHLThzGHRnF6aWnkei7ErRDUfFGWOoantVgL8vqeFKD1ciskdKed6xohCht84

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ai_message_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_message_kind AS ENUM (
    'Model',
    'Placeholder',
    'SafetyInterlock',
    'SafetyBlocked',
    'BudgetDeferred',
    'PolicyBlocked'
);


ALTER TYPE public.ai_message_kind OWNER TO postgres;

--
-- Name: ai_message_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_message_role AS ENUM (
    'User',
    'Assistant'
);


ALTER TYPE public.ai_message_role OWNER TO postgres;

--
-- Name: alcohol_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alcohol_status AS ENUM (
    'Never',
    'Occasional',
    'Moderate',
    'Heavy'
);


ALTER TYPE public.alcohol_status OWNER TO postgres;

--
-- Name: appointment_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.appointment_mode AS ENUM (
    'InPerson',
    'Video',
    'Phone'
);


ALTER TYPE public.appointment_mode OWNER TO postgres;

--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.appointment_status AS ENUM (
    'Requested',
    'Confirmed',
    'Completed',
    'Cancelled',
    'NoShow'
);


ALTER TYPE public.appointment_status OWNER TO postgres;

--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_action AS ENUM (
    'UserRegistered',
    'UserLoginSuccess',
    'UserLoginFailed',
    'UserLogout',
    'PasswordChanged',
    'AccountLocked',
    'AccountUnlocked',
    'EmailVerified',
    'UnauthorizedAccess',
    'ProfileUpdated',
    'RoleChanged',
    'ProfilePhotoUpdated',
    'AccountDeleted',
    'TokenRefreshed',
    'TokenReuseDetected',
    'SessionRevoked',
    'PatientRegistered',
    'PatientSearched',
    'PatientRecordViewed',
    'PatientDuplicateDetected',
    'PatientDuplicateAcknowledged',
    'PatientAccountLinked',
    'EncounterCreated',
    'EncounterClosed',
    'AssessmentCreated',
    'AssessmentUpdated',
    'AiMessageSent',
    'AiResponseGenerated',
    'AiEmergencyInterlockTriggered',
    'AiOutputBlocked',
    'AiBudgetExceeded',
    'AiPolicyBlocked',
    'AiProviderError',
    'AiConversationDeleted'
);


ALTER TYPE public.audit_action OWNER TO postgres;

--
-- Name: audit_severity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_severity AS ENUM (
    'Info',
    'Warning',
    'Critical'
);


ALTER TYPE public.audit_severity OWNER TO postgres;

--
-- Name: blood_group; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.blood_group AS ENUM (
    'A_Positive',
    'A_Negative',
    'B_Positive',
    'B_Negative',
    'AB_Positive',
    'AB_Negative',
    'O_Positive',
    'O_Negative',
    'Unknown'
);


ALTER TYPE public.blood_group OWNER TO postgres;

--
-- Name: encounter_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.encounter_status AS ENUM (
    'InProgress',
    'Completed',
    'Cancelled'
);


ALTER TYPE public.encounter_status OWNER TO postgres;

--
-- Name: encounter_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.encounter_type AS ENUM (
    'ClinicVisit',
    'AmbulanceIntake',
    'Emergency',
    'Telehealth',
    'FollowUp',
    'Screening',
    'FieldRegistration'
);


ALTER TYPE public.encounter_type OWNER TO postgres;

--
-- Name: gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender AS ENUM (
    'Male',
    'Female',
    'Other',
    'PreferNotToDisclose'
);


ALTER TYPE public.gender OWNER TO postgres;

--
-- Name: identity_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.identity_status AS ENUM (
    'Unverified',
    'Provisional',
    'Verified',
    'MergedAway'
);


ALTER TYPE public.identity_status OWNER TO postgres;

--
-- Name: lkw_certainty; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lkw_certainty AS ENUM (
    'Exact',
    'Approximate',
    'WakeUp',
    'Unknown'
);


ALTER TYPE public.lkw_certainty OWNER TO postgres;

--
-- Name: lkw_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lkw_source AS ENUM (
    'Patient',
    'Family',
    'Bystander',
    'EmergencyServices',
    'ClinicalRecord'
);


ALTER TYPE public.lkw_source OWNER TO postgres;

--
-- Name: marital_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.marital_status AS ENUM (
    'Single',
    'Married',
    'Divorced',
    'Widowed',
    'Separated',
    'PreferNotToDisclose'
);


ALTER TYPE public.marital_status OWNER TO postgres;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'General',
    'Appointment',
    'Report',
    'Medication',
    'CareTeam'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- Name: physical_activity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.physical_activity AS ENUM (
    'Sedentary',
    'Light',
    'Moderate',
    'Active',
    'VeryActive'
);


ALTER TYPE public.physical_activity OWNER TO postgres;

--
-- Name: registration_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.registration_source AS ENUM (
    'SelfRegistered',
    'StaffRegistered',
    'FieldRegistered',
    'Imported'
);


ALTER TYPE public.registration_source OWNER TO postgres;

--
-- Name: role_name; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.role_name AS ENUM (
    'Admin',
    'Patient',
    'Doctor',
    'HealthcareWorker',
    'LabTechnician'
);


ALTER TYPE public.role_name OWNER TO postgres;

--
-- Name: smoking_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.smoking_status AS ENUM (
    'Never',
    'Former',
    'Current',
    'Occasional'
);


ALTER TYPE public.smoking_status OWNER TO postgres;

--
-- Name: tobacco_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tobacco_status AS ENUM (
    'Never',
    'Former',
    'Current'
);


ALTER TYPE public.tobacco_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_conversations (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    summary text,
    summary_through_message_id uuid,
    summary_token_count integer
);


ALTER TABLE public.ai_conversations OWNER TO postgres;

--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    role public.ai_message_role NOT NULL,
    content text NOT NULL,
    is_placeholder boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    kind public.ai_message_kind DEFAULT 'Model'::public.ai_message_kind NOT NULL,
    safety_rule_version text
);


ALTER TABLE public.ai_messages OWNER TO postgres;

--
-- Name: ai_usage_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_usage_daily (
    id uuid NOT NULL,
    user_id uuid,
    day date NOT NULL,
    requests integer DEFAULT 0 NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    blocked_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ai_usage_daily OWNER TO postgres;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    scheduled_at timestamp(3) without time zone NOT NULL,
    duration_mins integer DEFAULT 30 NOT NULL,
    mode public.appointment_mode DEFAULT 'InPerson'::public.appointment_mode NOT NULL,
    status public.appointment_status DEFAULT 'Requested'::public.appointment_status NOT NULL,
    reason text,
    notes text,
    location_name text,
    cancelled_at timestamp(3) without time zone,
    cancelled_by uuid,
    cancel_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    user_id uuid,
    action public.audit_action NOT NULL,
    resource text,
    resource_id text,
    severity public.audit_severity DEFAULT 'Info'::public.audit_severity NOT NULL,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: care_team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.care_team_members (
    id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    care_role text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    active_from timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    active_to timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.care_team_members OWNER TO postgres;

--
-- Name: doctor_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_profiles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    gender public.gender,
    registration_number text,
    hpr_id text,
    specialty text,
    qualifications text,
    hospital_name text,
    years_experience integer,
    is_verified boolean DEFAULT false NOT NULL,
    verified_at timestamp(3) without time zone,
    phone_number text,
    profile_photo text,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.doctor_profiles OWNER TO postgres;

--
-- Name: encounters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encounters (
    id uuid NOT NULL,
    patient_id uuid NOT NULL,
    visit_id text NOT NULL,
    type public.encounter_type NOT NULL,
    status public.encounter_status DEFAULT 'InProgress'::public.encounter_status NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at timestamp(3) without time zone,
    location_name text,
    created_by_user_id uuid,
    appointment_id uuid,
    chief_complaint text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.encounters OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public.notification_type DEFAULT 'General'::public.notification_type NOT NULL,
    title text NOT NULL,
    body text,
    action_url text,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: patient_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_profiles (
    id uuid NOT NULL,
    user_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    gender public.gender,
    phone_number text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'India'::text,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relation text,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    abha_id text,
    alcohol_status public.alcohol_status,
    alternate_phone text,
    blood_group public.blood_group,
    current_medications text,
    district text,
    existing_diseases text,
    family_history text,
    known_allergies text,
    marital_status public.marital_status,
    middle_name text,
    occupation text,
    passport_number text,
    physical_activity public.physical_activity,
    previous_surgeries text,
    profile_photo text,
    smoking_status public.smoking_status,
    tobacco_status public.tobacco_status,
    village text,
    aadhaar_last4 text,
    abha_id_hash text,
    preferences jsonb,
    shri_patient_id text NOT NULL,
    phone_number_hash text,
    dob_is_estimated boolean DEFAULT false NOT NULL,
    registration_source public.registration_source DEFAULT 'SelfRegistered'::public.registration_source NOT NULL,
    registered_by_user_id uuid,
    identity_status public.identity_status DEFAULT 'Unverified'::public.identity_status NOT NULL,
    is_synthetic_data boolean DEFAULT false NOT NULL
);


ALTER TABLE public.patient_profiles OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    resource text NOT NULL,
    action text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: profile_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_photos (
    id uuid NOT NULL,
    patient_profile_id uuid NOT NULL,
    filename text NOT NULL,
    path text NOT NULL,
    mime_type text NOT NULL,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.profile_photos OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    family_id uuid NOT NULL,
    revoked_at timestamp(3) without time zone,
    replaced_by text,
    expires_at timestamp(3) without time zone NOT NULL,
    device_label text,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    name public.role_name NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: staff_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_profiles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    job_title text,
    department text,
    employee_id text,
    phone_number text,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.staff_profiles OWNER TO postgres;

--
-- Name: stroke_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stroke_assessments (
    id uuid NOT NULL,
    encounter_id uuid NOT NULL,
    lkw_at timestamp(3) without time zone,
    lkw_certainty public.lkw_certainty DEFAULT 'Unknown'::public.lkw_certainty NOT NULL,
    lkw_source public.lkw_source,
    lkw_note text,
    facial_weakness boolean DEFAULT false NOT NULL,
    arm_weakness boolean DEFAULT false NOT NULL,
    leg_weakness boolean DEFAULT false NOT NULL,
    speech_difficulty boolean DEFAULT false NOT NULL,
    sudden_confusion boolean DEFAULT false NOT NULL,
    vision_problem boolean DEFAULT false NOT NULL,
    severe_headache boolean DEFAULT false NOT NULL,
    balance_problem boolean DEFAULT false NOT NULL,
    loss_of_consciousness boolean DEFAULT false NOT NULL,
    other_symptom_note text,
    urgent_flag boolean DEFAULT false NOT NULL,
    on_anticoagulants boolean,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stroke_assessments OWNER TO postgres;

--
-- Name: stroke_lkw_revisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stroke_lkw_revisions (
    id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    previous_lkw_at timestamp(3) without time zone,
    previous_certainty public.lkw_certainty,
    new_lkw_at timestamp(3) without time zone,
    new_certainty public.lkw_certainty NOT NULL,
    new_source public.lkw_source,
    reason text NOT NULL,
    changed_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stroke_lkw_revisions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role_id uuid NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) without time zone,
    last_login_at timestamp(3) without time zone,
    password_changed_at timestamp(3) without time zone,
    verification_token text,
    verification_expires timestamp(3) without time zone,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2879a804-2e18-4ef6-bcad-e0363e5036ac	fe5c5e665e6f3104a70b2b07c29950b89d8906b52514977f9d1dd17f5e6da478	2026-07-23 13:09:40.883028+05:30	20260723073940	\N	\N	2026-07-23 13:09:40.759176+05:30	1
596fe35b-8d95-43ff-b0b9-7c259f48f4e9	4eae671e3f5a96611ab55311435f3689113b9f87050694832167f95f2539ae51	2026-07-31 10:00:09.856139+05:30	20260731043009_firstmigration	\N	\N	2026-07-31 10:00:09.824529+05:30	1
34061801-24ff-4b04-80bd-e836ca8c30ba	469eab8b9e67ecff0f9bbadb450a423d1ccbeba28d838e811bd10ef84fe057d4	2026-08-25 09:27:22.677623+05:30	20260824120000_baseline_password_reset_encryption_preferences		\N	2026-08-25 09:27:22.677623+05:30	0
aa2c000b-2ea7-4f8c-808c-85bc2d277a94	c07907b61ed8ce80dda1d6676b5353f655939f86702c1389cbb7b8168e4acb3e	2026-09-17 16:01:53.9581+05:30	20260917090000_query_performance_indexes	\N	\N	2026-09-17 16:01:53.944609+05:30	1
10a53aef-68f8-491c-92d9-a6ee3c0cdda0	c481941d107c19ccb88215e1ec01d8b2c94e36dfd32d1cb9c02a0819850d9312	2026-09-09 14:48:31.222879+05:30	20260909091831_phase2_roles_sessions_care_appointments	\N	\N	2026-09-09 14:48:31.128944+05:30	1
7fe080fa-84f4-48ce-a164-fa64ea6e0588	3347175a45eb9571a3c26eec5c0bfcde7b15d8c7b99b8833aad8a0567c80a43a	\N	_pending_20260911100100_patient_identity_constraints	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: _pending_20260911100100_patient_identity_constraints\n\nDatabase error code: 42703\n\nDatabase error:\nERROR: column "shri_patient_id" of relation "patient_profiles" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42703), message: "column \\"shri_patient_id\\" of relation \\"patient_profiles\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7657), routine: Some("ATExecSetNotNull") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="_pending_20260911100100_patient_identity_constraints"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="_pending_20260911100100_patient_identity_constraints"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	2026-09-11 10:40:38.408911+05:30	2026-09-11 10:40:08.977222+05:30	0
7e50669b-8eb1-4c47-8df5-5eb9a14576c1	2e9054a1b1cdbf633a7af506221f7e0a16cff2c3358d645cd25402c0ad1afe27	2026-09-11 10:41:01.06453+05:30	20260911100000_patient_identity_additive	\N	\N	2026-09-11 10:41:01.041486+05:30	1
9411fb84-70d8-4152-a7a2-0470db17e7cb	cdaafbdb5d96f78aa77d39f02683a3935cdbe249f52abc1b616c8ca75cbbc012	2026-09-17 17:05:49.887875+05:30	20260917120000_ai_conversations	\N	\N	2026-09-17 17:05:49.868323+05:30	1
0b2ccfc4-062d-4245-804d-0cdaed1bffa8	82c283b3bf1468cd9ed7939a4e393cb788abd3597b02d3bcd9e51cdbb4a5801a	2026-09-11 10:41:01.099128+05:30	20260911100200_encounter_and_audit_actions	\N	\N	2026-09-11 10:41:01.066165+05:30	1
b71df678-ed6b-439f-bd08-e87021294404	560c7fb505233cce804b1cb5545c3c7ea14e539a0bf283669f75c2121a04edae	2026-09-11 10:41:01.131289+05:30	20260911100300_stroke_domain	\N	\N	2026-09-11 10:41:01.100683+05:30	1
4bbbeb35-5929-4c48-9d5a-a9da7155f317	3347175a45eb9571a3c26eec5c0bfcde7b15d8c7b99b8833aad8a0567c80a43a	2026-09-11 10:47:51.768292+05:30	20260911100100_patient_identity_constraints	\N	\N	2026-09-11 10:47:51.757367+05:30	1
c438170e-ef0a-4bcf-8539-bcf34fb0c046	372b8ee5812fd64c8e862ee202a18f525984f28020589651cd77736e1965f29d	2026-09-18 10:57:18.330441+05:30	20260918090000_ai_model_safety_budget	\N	\N	2026-09-18 10:57:18.302294+05:30	1
\.


--
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_conversations (id, user_id, title, deleted_at, created_at, updated_at, summary, summary_through_message_id, summary_token_count) FROM stdin;
aa5e2a76-73e5-4d55-8afb-b7b844e1d74e	839f3441-a924-45aa-b78c-19f64b24ef1b	aw4TxHkGKznHzx+O.Z0v42q99rzycxsNHQCq1uQ==.1VJ8gmdfylUPvflImnKXrRMLzy7HWVn+ErqRO9Uk775DOxeEfgoPgKNxioiPIP05nwtc	2026-09-18 05:21:51.091	2026-09-18 04:17:58.345	2026-09-18 05:21:51.093	\N	\N	\N
30697a4f-facb-4ea3-a308-c13283ccbcb2	839f3441-a924-45aa-b78c-19f64b24ef1b	ZUeyAOqCkcQLikTh.27X1HyoqdZzqyOA1yAhxmw==.v43whO5uK5k2FFs7gR+GkhsrJcpvXLszwvVvlcXwQ5wYvfx3HOiEFp6PPnlVGL/Ehg8=	2026-09-18 05:21:53.444	2026-09-18 04:18:07.713	2026-09-18 05:21:53.446	\N	\N	\N
0e9e9e80-b64f-4f9a-8b04-42fefabc2454	839f3441-a924-45aa-b78c-19f64b24ef1b	IXOOJJIKfh/QNGtx.FZUKdrQzl6JvlaAzJemZGQ==.eoMxzuhtYEQlEI/16xFu0vfWgmb47chww6eXE7qgFTjqhU8f0O1sXI5CErPb	2026-09-18 05:21:56.707	2026-09-18 04:22:36.581	2026-09-18 05:21:56.708	\N	\N	\N
c7e03362-b945-4ff9-a0c5-938894c99281	839f3441-a924-45aa-b78c-19f64b24ef1b	WsSzzdkHQ5NRasZ4.R5dJ74jTBUofHPmPaVXHGA==.omwRvW1HXhNnahedJEZjRIQhW2gfrIt/5NlNbYvORLHIFMlNHKYUMWLef+ORS3zHCIyY5PCq+A==	2026-09-18 05:21:59.012	2026-09-17 03:30:00	2026-09-18 05:21:59.013	\N	\N	\N
fe0dc5a8-65c4-475c-a08d-31b56dea3a1c	839f3441-a924-45aa-b78c-19f64b24ef1b	rfdEezKiJfpgKtPb.vMfMd41zIQQxwprdvKce4g==.vE+mzJ8IKnxa5fp0yLkP9lROYncdlOD5kqYnqMnDV7fIY8Zgh2ErzA8VJFF9ODcLng==	2026-09-18 05:22:01.321	2026-09-15 14:30:00	2026-09-18 05:22:01.322	\N	\N	\N
37e1a118-a6e4-445e-a725-4124e9893919	839f3441-a924-45aa-b78c-19f64b24ef1b	nxsMt6w3jGzORNOE.J7dFiGV/wH8YDxG0lIvTHA==.HYZQNv2bcKZNVwQa9XyQM6mPIHOqAcLpTJKgc81ma2Ngr3nHNYq7dhhsBeoMMcZGuw==	2026-09-18 05:22:03.557	2026-09-12 05:30:00	2026-09-18 05:22:03.558	\N	\N	\N
\.


--
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_messages (id, conversation_id, role, content, is_placeholder, created_at, kind, safety_rule_version) FROM stdin;
70a68b64-d522-4c6e-93ae-a18d27d98d7c	aa5e2a76-73e5-4d55-8afb-b7b844e1d74e	User	D79/XBRQU2i0uJd4.yrcAel91STYcqDeRTpD+vQ==.mAUQzeRfSVBBFdjfiKIOf1ldCLKLsiO1Qc2ouYY8vE9kTDW68/pe0GZdeopOnspgH/ok	f	2026-09-18 04:17:58.353	Model	\N
398feb8a-1b4b-4ca3-934c-1bea8b6a5049	30697a4f-facb-4ea3-a308-c13283ccbcb2	User	WySugtbdkkdrctGA.Jt20BLr6eC9mhIKiv0VmIA==.lt3uLL8xEfUE88ehcIfizQSndO2VUdtFD2V/XxJP0F/KEDy6gUgQ4iBS+Vo6BoEr1Qc=	f	2026-09-18 04:18:07.721	Model	\N
1f954cec-4533-4bdd-ae68-677805f24e6e	0e9e9e80-b64f-4f9a-8b04-42fefabc2454	User	HGZwXuB6omwITYLW.FOYayVxBcwtfinF9shZjXA==.wcGrLOKC1CoRlQ+HWOTuWEQJvLli3+ioWybZUStLNbMCfedd5tClMVf3R3en	f	2026-09-18 04:22:36.59	Model	\N
6f87abdf-9643-4ff1-b19d-e5558b13e808	37e1a118-a6e4-445e-a725-4124e9893919	User	c922HDUqOdTeZ2PO.Ji1PaJnF/bAHwKRirGBrQA==.2ECTsvHT7Y7+I6nKf0h9bMRbqcWfy2gM1dzJIYFWZ4Q2skHGZvbDlfyOzDIGYSZsfw==	f	2026-09-12 05:30:00	Model	\N
486ce6fa-2e3c-4487-81e2-3d2761846e89	fe0dc5a8-65c4-475c-a08d-31b56dea3a1c	User	NhJljePr4OrG0YG/.A1Uui1bfQAb64rziWNfM2w==.wXacLG0ua9nLq9GvnRfsQ7MqW6QBVXpIKplG2XFltC3CxxnYbrgw5prO/63kSvo34w==	f	2026-09-15 14:30:00	Model	\N
0b5b6dca-5dbe-4c1a-a690-80fe15de4218	c7e03362-b945-4ff9-a0c5-938894c99281	User	EZPhsBP3DE49kGX5.fF5DGlwa195eIoOwiYUx7w==.k/JWgQVPDxERbmPRbES1YmyuzYJxxWv7PgpW69/f4olAEdIsg12GER9hWMnm/u9v9DjDZb1PxQ==	f	2026-09-17 03:30:00	Model	\N
a94d37b4-2dca-45b3-9ad8-abe281b97bc1	aa5e2a76-73e5-4d55-8afb-b7b844e1d74e	Assistant	2Jwcl6EquecB8h8n.H46HPLEtls2yD0WZhn68hA==.WjpbW0SP+2rdWhO5iRdi4604CRmkNn2j+wxrigoIPoQm63uShwCs5E2eQRVzBVNHDiCgQNh3h1AWwkdUi02Fv4wSy1O5Kj7h1Ta6Hcu2S8T2O0dhKN90Pc65jhGDxnIVGaLg7/QTrIdwdDpeULBsYV9NPJ9JeItSAtvgRmA5XskGt5GWxpmTO/9rEoprxlgJJitDxDoN0Qwq4Z57SMG7E9mlJJT70NLKFlEZmQVkrrMz/Ezs6S11ZYtb4oImeaqY+4Z7zQrGNBws+SG18yRi/++uFyHSsOB/Is91H3KKY2VIlx8llMjUZjg17jH8r9PICs6ACpIhe22+b28fnV1LnmQZJbUy0g4tpnWT+RB/6cn0Ug+0k+xpL3b2EZKC	t	2026-09-18 04:17:58.353	Placeholder	\N
9c134e24-f159-484f-aa42-3ebb11ff16e7	30697a4f-facb-4ea3-a308-c13283ccbcb2	Assistant	Hk5mvJ/1bQJzU/Q/.16SN0eL00mSnMScASPQuQw==.6HVSD24k6wwXcfyTpSBUY5twMhS07eCF3xSEcdK2MGFO76+sTBgprAo9l99+tE+PRoCWz7QwSbaZj8BTijawvZOtzJrlBR2ynu8+w3TY9tF/+sL4BVW8hI2QF81bj4UIrXFoQDyqP7UIhwXiaSYMd0ly0pHkgnypoLeJ5sAtfDDkvms31q3ijJnMsA6LDimJuJLPupzwwSGUlJ4TSpgIWH2uxvT8ixoejYrFvp4B3LSbj3oXA+fGLy+1nOTYDla6Z2XD4oGv6OMzMtuX/f1anLRo0yKGzLPOmquK98AYAq8W0+GE2P8BUVh9/OCyvGmYFrbNSYemixvadDELtM+vDruOz3+ftR48l6LFAPu+EHK9yMTsh64ojIsl9IHY	t	2026-09-18 04:18:07.721	Placeholder	\N
3db40261-9eff-4032-bcc5-e045f6d96491	0e9e9e80-b64f-4f9a-8b04-42fefabc2454	Assistant	NhWdJX/xWLGbe9NF.GD0zvC+G08QSvk+/PhJhrw==.+wkplrh0GNiffaBbA6VF175rmujqwWS3E/gLcbq1NB9oA5543sqUgclZa9us5mG6rwW0kW4jTClN7wFPLf80MpkDzrVXCoDpCWCGAVkref8U9mxVEFV2EbhmUnAECndGDZRTqTP99vvvjAyINanyCZI3zIdAWfnnvA52wQJwoUnLakkK2X56svQXtY0TVgs2rtxqa6fhKXRhE4FYlw88nNVY5SWV2dLP6cFvQkt1ODUi5NdOHK8X3gCulz+d3V0wQVSJLnOkiW/OLoGWA/G5t1RTFwSJ74fK9PKCRC9MQ9Zd4YESKY1a6bamICyeOGiWZwMqyve0SIRHlK+pIvYq+spx/gZ5IrfYoQLtkSXmqz/it3OIbP3aPYp/JwL/	t	2026-09-18 04:22:36.59	Placeholder	\N
9f263a12-302d-4273-a434-910d47d3872f	37e1a118-a6e4-445e-a725-4124e9893919	Assistant	5oATZ2AbvK+ikYQ9.cmKBI5le3+nh7V2rPOWbmQ==.O4JF/sMW+8rYl3Ct5pV53iLgv1E81Ee8B6Qt00GSfeZGY00OiqmuIghe7sM3iYaYKFAa2mFguqHWxeATl3JnZ1f75bh3YnAxH9onzz6OiYGqusA9EgkOT3708ktfcWN4sJQqs5u45vJwumVR2bRyO93FAX/QHv8OVgt2wMRO7a6m9IPg1kHzp+fGJdxMJLvMdFizqSiclAlkq7clouy8lN4faTsCOptbQu9P4M9v93MjhBsvTe7X4P7MIEbWNdA+oMYrUVIgWI6nTyMv1a3pRgrjOBlX8o8W65PPm8usJ6CI0u9wNdFN+XDj9paX/GUEx1nWuXlhSOy+LJuO1dJwBVW4b+GyRNkhuIB1hzdYhakxQ28aVDeOQOhmBjH9	t	2026-09-12 05:30:01.2	Placeholder	\N
c08c4224-6a21-40bc-82bb-de088d1c88e7	fe0dc5a8-65c4-475c-a08d-31b56dea3a1c	Assistant	uTMK2Moh+KwLDL9+.qXNJTkSwxl77vFVZaPRiiQ==.S6WINiJL1SQUu+pwF9//SoQmC37O7GZS4wIpAjBBnWqtrMbwmNJ5Tjdl7oC+7t8MljBzZE4aOUz1/TpagQvuCUxYKrbfM2OvtqQ0f2Lkb57A0XDAwCxjpS196K4FF0Dr2s+T4nRS0ieh8zmc5JhnvUI7g+M8orPgBG9c4dlPdJSoA6NsbRW9TCpgxEnj411TgpEnxBDNfAI07UJjQAArevjwDNrOy3P57tzOlyJQFf1bT5UHCC4PKW87uxZ/FBKB9/Pmxnd3o/a1o4dLbkpEHk1OyffK6Gco1OeQMG4IDyEBmuZiB5IRh9MCUJAgB1vKEmRGyJqmI+6fzwwjnZGM5w3BNcCrlTc/dkdqGc5+uj6ZjzrL5r9jAk+EX2iL	t	2026-09-15 14:30:01.2	Placeholder	\N
eb79333e-d6a4-46a1-8ff7-3caf084f9774	c7e03362-b945-4ff9-a0c5-938894c99281	Assistant	v6sFVJVkBPV7cWUH.aOD/xWDcyBaoxOM0wQ5Maw==.JFqWhdKtinhjCG1TTAVcl2nJ2hLbXCdSV0/OvWxh8qG3zQvLphHo4m+2ie7D4bY5XcAOv8xX7Fc23X3FusMCfRbQ3cYa3N+4PtwI7GUaaimunwT3Iz8ILhSguaOz8b2ODXWs8FyQHQY/iUxm4gQRaV4kKLB/tE73/p5v1fDHpQE3vkdNtuJkWF0hZ9s+WUFxB0uAgGNS2dLmuRbPxU15aNYx2Y18rsmtofNsaL9Zr9lgRD8+Yj9fAjmWB0a2cxTz81tU1Oj4DJPrrawIt5w/UXiDGtzLRsbKy8i0vGU/FvQ0qejXk9AVCYgVgY/o4fYs3D8q9VICNxTzxjbS5WDoUgs78YuHo0RQabm6hvUZJn26G1iV15cuHcvdq+pw	t	2026-09-17 03:30:01.2	Placeholder	\N
\.


--
-- Data for Name: ai_usage_daily; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_usage_daily (id, user_id, day, requests, prompt_tokens, completion_tokens, blocked_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, patient_id, doctor_id, scheduled_at, duration_mins, mode, status, reason, notes, location_name, cancelled_at, cancelled_by, cancel_reason, created_at, updated_at) FROM stdin;
18d69a05-477f-42a3-b593-553262c26157	0084af99-c833-4f60-b311-1af23f3010a2	aa320f6b-d1f7-4e1d-960f-697965a81715	2026-09-17 15:30:00	30	Video	Requested	AdApRZ2fz/EPtP4s.YYwPnLwIt+8aR8n4b5d4HQ==.Sa29KFyEI4w=	\N	\N	\N	\N	\N	2026-09-09 10:31:44.97	2026-09-09 10:31:44.97
1af02274-6c5d-4b47-b22b-f831a40271e7	0cfddff2-a875-486a-b156-cd9c70cf5e83	2096befc-1265-4e87-9809-460345b64071	2026-08-27 08:47:03.813	30	InPerson	Completed	6fP/d+neAjpE+aVh.92tvrWU9iRJkrih19SNybg==.mnvqFu7/31hG77VZ2HfKkWm+352Oos9V4Tc99pIIm/JGWbch8KuVOvU=	\N	IndoStates Health Hospital, Coimbatore	\N	\N	\N	2026-09-10 08:47:03.818	2026-09-10 08:47:03.818
48251952-a3c6-47cd-8696-7437ddab7819	0cfddff2-a875-486a-b156-cd9c70cf5e83	aa320f6b-d1f7-4e1d-960f-697965a81715	2026-09-20 05:30:00	30	Video	Confirmed	SFxVCQM1UJ2goeHK.IUsXcYwtvUx3ny96oXxJ/Q==.Q8xGqdZBqJ/z67hcG8k8dU3CFwmJNlzlTDHxTHheGCMOs/LifZsXvPddW7mFk60tWI0=	\N	\N	\N	\N	\N	2026-09-10 08:47:03.821	2026-09-10 08:47:03.821
7c44c992-7fae-4319-9e49-abd5791be810	0cfddff2-a875-486a-b156-cd9c70cf5e83	2096befc-1265-4e87-9809-460345b64071	2026-06-25 04:30:00	30	InPerson	Completed	lHES3S+ODz9qXnyH./xdkECDENphMcQfzZodhrw==.O3vfn91OR9dMFi2608H9R09K2bQC7zprkvUGup4S0kt6RvSZngFwOlKNJtld9/zB/qFEQSPd	\N	\N	\N	\N	\N	2026-09-17 11:09:22.758	2026-09-17 11:09:22.758
e542e42a-75c2-4b01-a9a2-552d2b2e0cf1	0cfddff2-a875-486a-b156-cd9c70cf5e83	2b5b1081-cb01-4491-870b-8385c0a8cb1d	2026-07-23 06:00:00	30	InPerson	Completed	B4/a4ijcQ/qsIIQh.v8uu8flKfrY24um3gCbJbw==.L56hLiYT0kpa3CYtRuugPslU6sVVXTQurJwKQ87p8xXzUPv80FHTZGGEXQ==	\N	\N	\N	\N	\N	2026-09-17 11:09:22.762	2026-09-17 11:09:22.762
800c3db8-e5a6-42c6-acbf-c2b9f24b1e26	0cfddff2-a875-486a-b156-cd9c70cf5e83	cf710288-3070-47c9-a1f2-5006f32399fa	2026-08-13 04:00:00	30	Video	Completed	9d+CQ1v4R9t6FHxs.k+IwDHzzNGPp8bbxu+zpZQ==.99JmnhIcVsTXBkwFuo1ifw4yrQNc4gcI9MzIU3rrYIO5Pwuzu0M=	\N	\N	\N	\N	\N	2026-09-17 11:09:22.765	2026-09-17 11:09:22.765
dc1958f2-d5a2-45be-9fef-da445f9c2c81	0cfddff2-a875-486a-b156-cd9c70cf5e83	2096befc-1265-4e87-9809-460345b64071	2026-09-03 09:30:00	30	InPerson	Completed	L08SzOIBIz+PThsk.fYXLWDCznvbo1Gkz1y/cbQ==.VK2dye0vD2YvfEDuMTAahyoaOIR5/joEG13W/kormZVCRtU1BQdW7iov	\N	\N	\N	\N	\N	2026-09-17 11:09:22.767	2026-09-17 11:09:22.767
beb2c97f-c886-49bf-851b-6bd727831ad9	0cfddff2-a875-486a-b156-cd9c70cf5e83	aa320f6b-d1f7-4e1d-960f-697965a81715	2026-09-10 10:30:00	30	Video	Cancelled	EwMuW0gAuJxCMXXK.W6x7tqZl6aE8FWiSkSFsmA==.kdmlo2uZOWMY1xH6mh5lpo0B2ir2DVf1GLekHcjEuG8qJYjwieDG33G3HAArFcw=	\N	\N	\N	\N	EK8WVyee3tP8yws9.cYy+Xm63KXOEXw17u/UmWw==.ZYxVP5xp8DWiajyCh+LjpKzTXxNKoMfuEzklSEfD3TcQqNmYOwKA	2026-09-17 11:09:22.771	2026-09-17 11:09:22.771
c283f2f2-16b9-4dc9-ad67-a3e94553af99	0cfddff2-a875-486a-b156-cd9c70cf5e83	2b5b1081-cb01-4491-870b-8385c0a8cb1d	2026-09-29 05:00:00	30	InPerson	Confirmed	Pavsi1p/j3CZ85Ul.40KMFnhrpU6+8ENZCBzL2g==.xbs65yF3pcaIvULhMGuJAjHWhIWByeqLofZkA9MZrSD4bNs6aiQpFQ==	\N	\N	\N	\N	\N	2026-09-17 11:09:22.774	2026-09-17 11:09:22.774
9054eb1d-ddff-4262-8a3e-e8803d216a01	0cfddff2-a875-486a-b156-cd9c70cf5e83	2096befc-1265-4e87-9809-460345b64071	2026-10-13 03:30:00	30	InPerson	Requested	wRDP/sB94vwo65Rw.uElTZbURuCHMZsOS3u9JNw==.2AkFKkaidD6MzG0QmJ4Ediw4RFCuRJ355gWZ	\N	\N	\N	\N	\N	2026-09-17 11:09:22.777	2026-09-17 11:09:22.777
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, resource, resource_id, severity, ip_address, user_agent, metadata, created_at) FROM stdin;
ccc20495-f74b-4931-b185-4d2e0aed9106	67d1d7a2-3dee-498b-8e08-f7b16896ed2f	UserRegistered	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"role": "Patient", "email": "testpatient@oncotrace.health"}	2026-07-28 03:59:10.706
319fbd2a-f134-4743-ac5a-192bbdf75d2d	67d1d7a2-3dee-498b-8e08-f7b16896ed2f	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	\N	2026-07-28 04:01:24.89
c18686cc-16a0-47f9-9bb8-805e4c9f3856	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-07-28 04:03:10.269
e3d095b5-f13b-4534-868d-195cbdaee73a	67d1d7a2-3dee-498b-8e08-f7b16896ed2f	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	\N	2026-07-28 04:04:45.612
a1abe610-159b-4459-91c0-d29482e3fa20	c45486ee-7c9d-4005-9909-a2f7b52ff2c8	UserRegistered	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"role": "Patient", "email": "newpatient@oncotrace.health"}	2026-07-28 04:17:14.372
2d3ccc1d-8963-4c19-9a02-5abddb65f4df	1e942aea-1b44-43eb-a0f2-52eb6c79af0f	UserRegistered	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"role": "Patient", "email": "rajesh@careflow.health"}	2026-07-28 05:04:56.89
161f948e-daa4-4a42-94ff-e7fa55454402	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserRegistered	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"role": "Patient", "email": "anand.shriai@gmail.com"}	2026-07-28 05:15:49.53
18c06600-5eaf-40ef-88bf-4b219ae5e3d9	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	\N	2026-07-28 05:16:07.069
bf07537f-c396-4555-82a6-978b02e3944c	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	\N	2026-07-28 05:16:28.515
949a071c-7c40-40b6-ae25-3a7d6b3db786	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	\N	2026-07-28 05:16:32.151
f24e682e-9cce-43d6-b508-6b1f83d42259	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 1}	2026-07-28 05:16:40.724
2b5249ac-09b4-4605-93b0-0a4f776cd114	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	\N	2026-07-28 05:16:56.315
181bc3b0-5375-4c6c-af81-b4d123341e2f	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-07-31 04:31:16.662
e2835765-156b-4e0d-9b62-5e22f4e52461	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-08-05 04:24:38.655
8a9814c3-85aa-4d32-bd4b-3d88d4bb8fa7	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-05 10:00:03.289
ce1bdc86-91ed-4bed-9307-1214ef011a7f	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 03:38:59.023
f0e0b15f-c7e9-4f72-9484-e678094eede0	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 03:39:03.748
bd0abc04-8c9e-4cb8-8617-caa981015922	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 03:41:29.805
38edfcfb-a460-4062-8551-47b8950057e9	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 03:44:10.76
78683ca3-824a-4095-a1c2-d32943f839c0	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-08-07 03:44:25.547
c153e0ee-7d47-4bd1-9056-b3331d2b42f9	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-08-07 03:44:53.622
4d343fcd-fe20-476f-8afb-d7836f7e8c34	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"email": "nonexistent@test.com", "reason": "forgot_password_email_not_found"}	2026-08-07 04:01:05.559
cd4b7b9a-a5a0-4016-9a70-bf0ea7d2659f	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"email": "nonexistent@test.com", "reason": "forgot_password_email_not_found"}	2026-08-07 04:01:05.574
d3e313f2-08d1-4691-8cb5-c217d9c88c5a	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-07 04:02:02.394
a18abba1-f9b6-4bcb-9268-63e31a0d3eb7	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:03:57.685
226ec7cd-1309-49d0-8299-eeedbcffebd8	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:10:57.697
79ec1bff-66dc-4799-8b80-5b87c54cf27c	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:16:40.504
3d9b95cf-6099-49b2-8886-ce51039f7e6a	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:17:20.07
9c55ce45-5c97-430f-bdde-5de7bdc001ed	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:36:47.009
cf4aae65-f4cb-47c3-8deb-c26772c385a9	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"email": "test@example.com", "reason": "forgot_password_email_not_found"}	2026-08-07 04:40:14.178
bc66bcec-7349-4b84-8241-5b761f952d95	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	{"email": "test@example.com", "reason": "forgot_password_email_not_found"}	2026-08-07 04:43:04.896
fa4c9496-0b08-424f-836e-b33f6f22938d	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:51:03.279
5e1d6924-957c-4fc9-a61c-eab2ab29cd6e	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:51:29.074
d06ddf1e-d657-4b82-8442-323851434272	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-07 04:51:31.283
d7abdc8b-43d8-4774-8203-1255a9391f1b	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-07 04:51:38.367
06525de0-1bb3-40ff-8733-9ae3c32767e7	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-07 04:53:07.836
c3149102-8a48-4b83-b2f2-c754bf8d9672	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:47:38.355
1816b020-dff8-498c-a874-9cf1da366f10	\N	UserLoginFailed	\N	\N	Warning	127.0.0.1	\N	{"email": "nonexistent_account_987@example.com", "reason": "forgot_password_email_not_found"}	2026-08-07 05:44:19.41
efcc7949-1469-4446-a69c-bbae2965d1d0	\N	PasswordChanged	\N	\N	Info	127.0.0.1	\N	{"email": "test_reset_1786081459313@example.com", "stage": "reset_token_issued"}	2026-08-07 05:44:19.396
aa48f6ad-cff2-497a-aab2-cc82b3daae69	\N	PasswordChanged	\N	\N	Info	127.0.0.1	\N	{"stage": "password_reset_complete"}	2026-08-07 05:44:19.522
590623e9-d64a-464f-a7d3-d203e001d074	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-07 05:45:25.443
25141ac8-77e9-4df8-9f16-c3e41f95a81d	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 03:37:04.305
ec5fa592-8067-41c3-a881-56764b24ca8d	44e80ca0-5f14-4de5-9739-0fcd837f0054	UserRegistered	\N	\N	Info	::1	curl/8.5.0	{"role": "Patient", "email": "testmobile123@example.com"}	2026-08-08 04:48:47.571
35fa2980-2a87-4ae2-8b30-333ba465812d	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserRegistered	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"role": "Patient", "email": "anandjyothis@gmail.com"}	2026-08-08 04:52:26.966
ce1b1a85-8a8e-4720-ad4b-ee087d1ff433	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 04:52:40.356
cddf8b98-0986-4b6c-8596-4a55d9284a4f	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 04:52:59.487
8616fe53-cbc0-4b91-af52-c2d3aaea595e	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 05:03:19.264
f22192dc-1acc-46c4-8371-bbd8cbc12b3f	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 05:03:33.902
61cca08b-557c-44a6-b755-a1b82bdaa771	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-08 05:07:18.123
9e6efe36-b8df-477d-a2d1-dc8edd82af12	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 06:28:11.496
36d4753c-aaba-4c19-a3ac-0adfe46401ae	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-08 06:28:23.819
b09edc0d-07f0-49d9-9479-a49f597c1602	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-11 03:41:49.231
ec086c40-4a8b-490c-8407-79fd02fd91ba	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-11 09:16:02.984
c362abab-530b-41cd-8719-6bc7809fed9c	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-11 09:21:38.383
b177e983-2db6-4528-ac17-8b45eeedf9f2	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-17 04:40:08.667
ee56ffa5-952f-409e-8021-39675f5b1172	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-17 05:31:08.717
b7aa69d7-ae07-460f-8fc0-e566b3b7d39d	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "email_not_found"}	2026-08-17 06:10:35.53
fa2eb555-60c1-4093-872e-946e42784e49	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 08:58:12.613
2ac41b21-fb64-4bd9-a9e2-5933a661e8f8	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"email": "nobody-at-all@example.com", "reason": "forgot_password_email_not_found"}	2026-08-17 06:10:48.871
aa65e0f2-7921-400f-a50e-f0773445f1fc	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 08:58:39.826
344ee3df-6800-4b56-a705-89c3af1595e0	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 09:46:49.826
4a9efe58-572a-4daa-8dbd-cc24c243f178	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 10:47:28.814
eb5da90b-eadc-4a7e-b871-5093778c8472	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:27:29.561
a2f4aafd-18f3-48b4-8734-9cb266b13f10	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:34:12.572
9c829fc4-e914-4341-8408-833147e64eb2	\N	UserRegistered	\N	\N	Info	::1	curl/8.5.0	{"role": "Patient", "email": "qa.test.1786947021@example.com"}	2026-08-17 06:10:21.265
25de2948-975e-43b5-9208-0402179ff093	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 1}	2026-08-17 06:10:34.807
e6ba0400-8a06-4dad-9381-82ff13f4af13	\N	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-08-17 06:10:36.156
61f16edf-a584-49b0-b9c1-518dd8152e6f	\N	PasswordChanged	\N	\N	Info	::1	curl/8.5.0	{"email": "qa.test.1786947021@example.com", "stage": "reset_token_issued"}	2026-08-17 06:10:48.362
4f5a8299-0ba9-4bc1-ac99-9534cfdb85cb	\N	PasswordChanged	\N	\N	Info	::1	curl/8.5.0	{"stage": "password_reset_complete"}	2026-08-17 06:11:53.956
104dd55a-7bf5-4876-86ad-a8a311faa269	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 1}	2026-08-17 06:11:55.115
142c3e86-3e2c-43c5-b0c7-e26172ff9643	\N	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-08-17 06:11:55.738
69b7159f-2890-4715-bdbc-b11700149bae	\N	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-08-17 06:12:11.552
ed842fdb-a7c9-4eb2-be93-719aeda0ee12	\N	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-08-17 06:12:11.577
ab22f3c6-3299-48a0-a130-8323ac616ca1	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-17 06:17:23.915
6641eb57-6cb2-4654-a269-55ee50da3fca	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:34:12.678
4c4fa7c7-35ec-4c8c-a309-a3e60a50bed1	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:34:12.725
bcc593af-7936-49b2-83e5-9c183199dad6	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-17 07:48:29.47
6cabbd78-9746-4b22-8f51-9200b8f6d973	8250825b-8ed2-4879-bc56-25d409f3cbe8	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "anand.shriai@gmail.com", "stage": "reset_token_issued"}	2026-08-17 07:51:52.902
ae183c8e-b4f0-49a0-b5f5-808211655d1c	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:34:36.343
c90fd69d-63ca-4dc7-bea4-981cbfa2d2f4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:34:37.517
a7d9f059-27cd-4846-a015-79913523b737	\N	UserRegistered	\N	\N	Info	::1	curl/8.5.0	{"role": "Patient", "email": "teamshriai@gmail.com"}	2026-08-17 07:09:41.455
f3afcc82-b835-4ccb-8db6-d2207b72595a	\N	PasswordChanged	\N	\N	Info	::1	curl/8.5.0	{"email": "teamshriai@gmail.com", "stage": "reset_token_issued"}	2026-08-17 07:09:51.127
aef23df5-bc25-48df-bbcc-2e5995db46e2	\N	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"email": "teamshriai@gmail.com", "stage": "reset_token_issued"}	2026-08-17 07:52:48.421
37bc74f9-75c8-4af2-9c64-567c14969cec	\N	PasswordChanged	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"stage": "password_reset_complete"}	2026-08-17 07:53:35.949
a2cfe252-32ce-44f8-a1c1-70ac1da41eb0	\N	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-17 07:53:54.04
00d010d9-7890-4040-bb4b-7beb8c56b692	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:51:11.409
88637594-cacc-4b3d-9c01-1da183643fe8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:51:11.531
8b657f86-1ae5-4072-a1fd-29cb6d3eae30	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-08-24 05:00:21.82
238b97e4-7bf6-4edf-a935-7149e9d0efa8	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-08-24 05:00:23.308
2274cec3-0595-4b1f-858f-b5b9556fe99e	\N	UserLoginFailed	\N	\N	Warning	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"reason": "email_not_found"}	2026-08-24 05:00:29.993
4ee5fe5f-e32d-41b9-a7b2-b84d814d9c1e	f863144b-4b2a-4174-bb49-8fdf784cf731	UserRegistered	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"role": "Patient", "email": "anandjyothis57@gmail.com"}	2026-08-24 05:01:15.519
2d15e530-9f06-4b4f-8ac6-d1ceaf3500f9	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 05:01:22.601
a6cda924-3d1b-4ebb-94e4-48e11a12951f	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 09:04:21.052
48dc85c5-c7f8-4cbe-a75a-e9687b6840f4	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 10:27:02.019
869cee89-f46c-45c7-af19-c5ea2f39e596	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 10:27:08.202
247abb72-c62b-41b8-b17d-524bb2c3721a	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 10:29:45.053
a8db2267-4ea0-493c-813d-806a417fa236	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 10:47:09.468
7b44d256-990a-443a-b427-ddb675015584	f863144b-4b2a-4174-bb49-8fdf784cf731	ProfileUpdated	patient_profile	0084af99-c833-4f60-b311-1af23f3010a2	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	{"fieldsChanged": ["firstName", "middleName", "lastName", "dateOfBirth", "gender", "bloodGroup", "maritalStatus", "abhaId", "passportNumber", "phoneNumber", "alternatePhone", "addressLine1", "addressLine2", "village", "city", "district", "state", "country", "postalCode", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation"]}	2026-08-24 10:48:28.979
3c2b2999-6110-4c76-9e74-d4b0c9f685bd	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 10:48:48.354
b12d806f-68e3-4111-b7ea-5d2cbaaafe2b	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 10:48:53.908
f1fbd316-d5f7-455b-86fb-d484f56fad0f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:51:11.963
72764b88-dde0-4d5b-bff2-8917483ed8f3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:51:12.021
3e23d554-54ab-4ccd-b945-ba61d0ec914f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenReuseDetected	\N	\N	Critical	::1	curl/8.5.0	{"reason": "revoked_token_replayed", "familyId": "fff18331-91cd-43e0-b9e4-c0b59d1f62c7"}	2026-09-10 08:51:12.059
68cf2fb4-da44-4e2d-9b69-e627dd805c4a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenReuseDetected	\N	\N	Critical	::1	curl/8.5.0	{"reason": "revoked_token_replayed", "familyId": "fff18331-91cd-43e0-b9e4-c0b59d1f62c7"}	2026-09-10 08:51:12.088
6202102d-fca0-4133-accb-38c10751d81b	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 09:01:04.85
e5a467ba-6d49-44e5-8b2d-0d868a5c3d95	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 09:01:18.401
ae5f5297-afa8-4685-a6bd-62f89061f274	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 10:01:49.806
7455fd7d-6545-45ad-b1eb-d9d540582c3f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 11:02:43.822
33a6809e-b30b-4bc3-96d5-8fc7e27a5f84	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:29:12.401
f45d4043-3e03-4682-808a-26ed76992c92	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:29:19.944
36dfb888-c9ca-432f-98fa-346927bceccf	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-24 11:25:00.788
ec61c681-f7e8-4c6f-acfe-155fcc3fc29e	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:29:21.419
6cce95e9-0947-4f89-8265-814094815769	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:29:21.578
13fad795-6c9a-475d-998f-654888619bfe	\N	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "email_not_found"}	2026-08-24 11:25:46.021
4b5ccad9-e4a8-4a9b-ac79-cbf1124a15ab	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 04:05:45.435
12211c5a-102b-4510-817f-14ac8c95a9d3	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 04:05:48.559
19235c7a-9177-4237-9b61-f2c5f96ac590	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 04:05:52.979
25df02cd-6004-4447-82e5-70900622a31b	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 04:15:16.954
6759f1b2-e6c9-4fc0-a63d-223007f38e4d	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 04:15:32.952
1826af22-7805-4552-8d5e-a2f4d9dc0960	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:30:27.678
4975bed6-1fe5-485f-9f36-bd2c96a66b01	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:34:37.667
78bcf098-9add-4a16-9cd0-7e7d9f45d7ff	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:37:46.255
28c3f7e0-f8c8-4e6c-be72-04f71e36f4c6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:44.99
87817a9e-dfd4-43f3-ad41-c348831a2b3d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:53.83
43f8674c-7422-4a9c-a9f9-823988504ac1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:02.108
187f9b18-5948-4317-a294-2daeedefa4b4	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 03:29:51.314
943b5b1c-d184-47bd-97b9-a851271628d8	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 05:51:04.673
373ec376-f4ee-4a26-a5c1-d5529d087e79	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	\N	2026-08-25 06:09:31.444
53b2319a-6fe2-44f2-acb5-37444b08789b	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-08 03:41:17.571
f63bd07d-ed65-4631-89de-fbf95b59cf15	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:53:36.898
71d5b9b7-65c0-4feb-8b91-1e955b1654d1	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:53:58.023
31f40cd7-8f12-4fa5-99ea-101a50dd4c47	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:53:59.674
fbdd1e91-0e7f-4a16-9645-46eb286a80b9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:54:20.953
a8af76c8-9dbb-47dd-9aec-d83685c9bbfe	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 09:05:02.417
e8d03016-8730-404c-a2a4-a9cb20b60041	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 09:05:02.509
f42db642-8dfb-41d6-b755-b33350119151	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenReuseDetected	\N	\N	Critical	::1	curl/8.5.0	{"reason": "revoked_token_replayed", "familyId": "77251bb7-907f-4755-92f7-6b8ae3952998"}	2026-09-10 09:05:02.523
bf29c9c4-0777-4dff-bd8d-8fc2a685e85d	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 10:16:20.382
b2d94ec6-56ed-47cc-af00-966d3213e65f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 11:16:21.847
1be89dd8-e0b8-424a-91d2-6698119d7132	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:30:29.148
ba6d5d90-33cb-4040-a00e-480ce036270f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:30:29.349
18a76a81-458b-48bb-80bb-83842967cf48	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:38:03.253
26a5c6cf-a11c-426f-bb39-25d18b0777bd	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:40.022
184f9337-5321-41e3-97a7-71b7a72f49a3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:40.462
8c7a5dd8-1fe0-4b70-b153-77b893d5dbde	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:42.424
cbe7d7c6-c38b-4cd3-981f-75d3cc941149	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 09:54:06.785
7a12d563-23a4-4af2-97b8-4b2a74a5d32a	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 09:59:56.376
3e629d54-4727-425a-bca2-73b2d870d99c	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 10:00:11.847
63860e0b-2061-4fb5-bc33-495c86b90f0d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:47.381
db9b63d9-4881-4740-86aa-90bbfa398f2e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:47.703
82ab5d3d-8588-40e2-b2a0-6460bb7f8b79	8250825b-8ed2-4879-bc56-25d409f3cbe8	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 10:10:41.267
8293ec5e-f2c1-42f0-af4f-ed807e74f969	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	\N	2026-09-09 10:16:54.291
f274dbe3-c1e5-4955-aa54-5b3a36871895	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	\N	2026-09-09 10:17:12.495
40f34d72-43d5-48bc-98e3-daaf29a8781e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:49.692
8bfba406-ffce-49cf-8db9-37e9e28ba51c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:51.749
6636059f-4eb8-43f0-bec3-3045740d4134	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:55.905
d2fd0be4-8383-42aa-a16e-e62aa5fcab03	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:24:57.936
1bca56ef-9860-4996-973c-17c1831cd15b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:00.003
1ac6cb88-0bdd-4814-8cc2-c06e021ce705	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 10:30:58.04
15934d24-7521-48df-a492-6b85bf259165	f863144b-4b2a-4174-bb49-8fdf784cf731	ProfileUpdated	appointment	18d69a05-477f-42a3-b593-553262c26157	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	{"mode": "Video", "operation": "appointment_requested"}	2026-09-09 10:31:44.978
ceeb71c6-b6f0-4990-9c56-71965c5af61b	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 10:46:40.418
b9ec2936-7f8d-4528-bbb7-0651913c1187	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 11:01:52.412
0bb65e11-e085-4a5a-9fb4-1a355dc63335	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 11:16:52.408
722eb0b9-3bb6-4d05-9ba5-82cfbd8bdeb2	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 11:31:52.432
aacce1f3-f6eb-45f5-b8dc-1b586554b6c2	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-09 11:46:52.415
83e80540-8bdf-4c12-a0d3-a761ba8ee71f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:04.154
810c0ca8-1b19-4597-bafc-ce79fe756d13	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:06.204
b0c890b2-efc0-482d-9299-59fda3ac944c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:08.284
26167ec4-7949-497d-9cf8-dc79dc7bfcec	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 03:37:16.001
7659764d-8bf1-434d-b1be-6b0c1ab900e0	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:54:57.564
e530637f-05a8-4605-943a-a05eb5d97fc4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:54:57.654
e8086cee-8d97-47c5-a7dd-13756446bb6a	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:55:18.99
f0c04bc6-f82f-4620-a92f-ee7b8a5d8001	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 08:55:19.025
5a74018f-e9b8-4e13-bf35-81224a01f27b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenReuseDetected	\N	\N	Critical	::1	curl/8.5.0	{"reason": "revoked_token_replayed", "familyId": "0de7bbf8-d763-4f9f-bff5-c700764b4a5a"}	2026-09-10 08:55:19.065
6e39fa3f-6ff0-4b5f-9471-67b50aeaadad	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:55:32.779
3279c3a9-f869-444a-990a-00892ab60563	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:55:34.183
41246929-3ecc-46e9-98cb-e9992b274df7	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 09:13:49.81
b6fbb1e4-9627-46e2-abdb-e3360c9f2d8a	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 09:16:49.8
ad276cc6-f281-4041-bd47-2e9f60ebc6ed	f863144b-4b2a-4174-bb49-8fdf784cf731	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 10:16:30.831
16d6ed94-5d56-4aa4-8167-84cbc8daa581	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 10:16:43.907
764e25a1-f6fe-485c-9da8-6d0dc0a6c3e0	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:22:28.353
0a16ea03-2045-4c0f-81f6-8fda0af3b7d9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:22:28.511
ce2cd14d-d624-45f3-9bf4-006e1288d00a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:22:59.291
9f33e477-5096-477a-b509-40500eab75df	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:24:03.627
35bb6075-fd22-4663-a797-5d34002e47f3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:24:03.806
4c899ea3-ce30-416a-8da7-08121c840873	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:24:36.224
e08739fc-f497-4c17-b6bf-1fe8a663c136	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:25:40.833
02e5f988-b52c-405a-b0f0-187774bfd76b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:25:41.021
30abbccc-2142-4a9b-8ca2-1eb07abdcabc	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:26:20.631
61234d03-691e-4d6e-a3b8-df116ca6d494	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:31:33.827
e9627318-35c7-43b8-86d3-3673b31f44ee	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:32:34.536
f71bdf35-f4aa-4414-9176-91ad2bc894c6	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:32:50.068
7e43be61-e077-4e3c-8f35-e547a48e966a	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:32:54.528
1fd1b6d8-57b5-4e38-b0de-f1602179c7a0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:32:54.724
72f2aa66-f205-44e8-a2d7-65fc7bc03084	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:39:06.686
b8cec23b-4a50-4f78-9f2f-aebfb1aecfb8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:39:13.578
35170a8b-35a7-412f-b587-2369ea1e5091	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:39:15.037
6e9dce7b-1991-4f20-a9f7-51c15bf0ad5a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:39:15.207
83c5baf6-19df-4e47-834e-ddeadb933749	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:39:47.923
4086fb84-b54d-4a8e-894e-d50c21eaa36a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:39:48.099
aa13857c-addd-42c8-a1f8-366bd67da8f1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:44.495
ce93a7c2-bcbe-4362-b58f-0d23afa96fe4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:46.54
3a806837-1a44-4604-86f5-3dcd1bd4a1d3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:48.593
becd2a22-194e-4cc0-9dbd-9c9743c2ccf0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:50.649
84377205-237f-47de-9079-3183ad8e1cf9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:54.797
81afcada-e3ba-4a6a-b1c1-14d5ae2fe424	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:58.908
1ca09041-2e59-4004-9985-c754351657b3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:20:03.061
092212de-f632-4ec5-96a3-d47a92934171	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:20:05.12
a193c552-686a-4d52-9d37-dde927edeb59	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:20:07.182
eb5a3220-e895-4de1-8093-35c95a8d6521	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:20:09.276
e97842e2-0ac4-4c98-a160-77e5c1c91605	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:20:11.345
76e85da1-1ae0-4254-91cb-52bfdfb1a817	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 03:37:17.256
1cdafcba-0b7e-4f88-a2ce-d072721a28c5	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:55:35.673
81e35520-d049-4d2c-9900-9fbdd87e674e	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 08:42:02.019
d3b56b59-fd6e-4f97-b692-65d5f54aec0e	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 08:42:02.054
a458963d-43c2-446a-840a-7355fee7d203	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:56:05.129
6ce98211-be58-41bb-a2db-0c19e32bb393	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:57:57.509
81fe413c-f308-4adb-a16d-663bea7b438b	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 08:43:23.27
e3c5c014-e4a7-41fe-a856-4cb911004e47	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 08:43:23.295
bdc5ea23-c273-4cf8-b05c-1021f3b8ae15	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 08:58:59.585
6a97fa7e-3553-486d-8597-2308a8f64829	f863144b-4b2a-4174-bb49-8fdf784cf731	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 09:31:49.796
12f51669-92df-4c66-9859-b40506c3d0a8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 10:31:49.837
6b2b50a9-d862-40d1-a18b-4a62b39b30ad	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:23:16.443
87a698e6-5843-44ea-8dab-7e85f1e83d30	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:23:19.45
e6fd6bd6-5bea-4f05-a2bd-83f958b061e7	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:23:19.615
057b999a-d1a7-4127-9796-6108c359b0c5	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:24:02.648
3b6853ef-9471-407b-85d6-dacb44e7336b	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:24:39.743
cbc56077-4d70-413a-b22d-278708395182	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:24:39.905
4cad2705-c58f-4b6a-8364-8bc9edb715be	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:25:36.859
4beae7c7-edd1-4a2a-a1f1-611dae453db6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:26:24.725
20aac53b-8f61-44cb-8a52-c9e4b2e28425	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:26:27.71
3bdee6ba-91b4-4bbe-a06f-e1d7d756a183	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:26:27.888
2fc25e36-f325-4459-974e-2c0310201564	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-10 11:27:12.792
475d848b-6e3f-4862-a615-03d7331c1a52	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:27:26.058
1f5f821e-57e8-41a2-9e38-74fcd14cfe1f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:31:35.842
b23c1828-c4f0-4018-a5d3-55475815ace3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:31:36.022
cfa4dba0-4b35-4da6-8349-71081eda0aad	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:31:48.4
76fd7aae-a067-4b37-8988-67a3eda19846	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:31:51.797
5fde4aaa-7503-4624-946f-8dc815f65cbb	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:31:52.011
b030277e-8f4a-4918-b77c-eaec5f7b3e49	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:32:37.522
10a4e98d-2ac9-4846-9173-4c27e4d699a2	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:32:37.687
23650efe-14ed-40fa-85cb-12166f6a0558	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:33:59.223
f4d4d6e5-ce2c-4373-b8d0-920fe5e53dc3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:33:59.339
899b1b2c-e1ea-4330-a7ac-070862d9a531	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-10 11:33:59.467
c39306ce-0bb9-4ec9-809d-90ed92d32d40	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-10 11:39:46.483
ed8b5773-6e82-4b24-86d3-4fba3eb89d64	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:52.727
ab0f06b3-9d42-476d-b57d-c0ff6a2afa38	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:19:56.852
bcfc74c8-2165-45ee-9e3f-bea488371d68	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:20:00.988
80d863f6-e3cb-4e44-9e60-fac00d4c733f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:10.318
cca7bac6-1343-466f-bdc0-06568274f771	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:12.431
7bd9a258-548b-4764-b3ac-a2cc5bf78ba0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:14.469
476165cb-1337-4e58-8818-e89a28acca19	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:16.562
0365c09e-14a4-4570-a7f4-0bfa7522559e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:25:18.631
792e0e49-bb88-473c-a1d3-e0ac85a300cd	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 03:37:17.468
f44ea8cd-cc86-4eb4-a6c1-86948a86845a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:01.05
2350297e-f940-4ff1-b5ca-0bcca1b7c14f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:03.504
3da47b07-f361-4d87-b3e1-5d3522130f42	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:03.859
79794fd8-1983-4c57-ae6c-0de2884f500b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:05.845
d3604f0e-b00c-49ff-8397-70f9bcfd5ae3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:07.906
29b4188c-36b1-44a9-8853-164e607a01f8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:10.004
0ede0acd-1b4d-4d09-bef1-96f3cbff3f13	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:12.033
cb08eda5-8c94-44c8-8935-16d65858df35	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:14.098
8d85f652-eb3a-47be-9ea5-68fc1f4a5cbb	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:16.16
94a03082-628b-4833-a3a9-ca923516ba3e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:18.229
b47a12ac-0e1a-46f0-9ef7-940e7b055ba4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:20.275
9784269b-2948-4849-908a-efeb5aa9738e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:22.365
0171f6c6-5775-483f-bf2b-5a72d282cc23	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:24.432
eaf1c977-9434-4d93-8bfe-b077b83ef704	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:26.498
ab739eb2-39ee-45cf-9a20-e640856a8f4f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:28.551
fc40e71a-9a75-4ce9-bf47-571ebe122ed4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:30:30.617
36338b4c-35bf-4f1f-ade0-e53c517001c0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:10.552
882b4176-5718-41a4-980b-0334158b95b0	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:13.045
a1bbe966-c8af-4cb0-a245-827edc287c26	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:13.421
4dc7c1c6-601a-47d1-b1fe-ed11a21e6bdd	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:15.387
261b7a6d-d3b5-490f-b94b-e309340b0711	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:17.463
a043f4f3-2e47-4f90-9718-93192e333c9a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:19.503
56074fc9-3127-47a0-aeef-227143ac2ab9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:21.57
0ad05df9-ba9e-4341-8d51-f1ec87a92790	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:23.649
8301be56-5d18-4310-afcb-63eeacee8ba6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:25.715
d9e79385-d812-4063-9d5d-64862db782a2	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:27.816
0a1990f3-fcd8-4f5d-bdf9-0be58f85b57a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:29.839
18060216-a976-4d96-afed-cee4dfa6bf9a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:31.889
fd2cc3c4-f0be-4a0a-8df4-93b698c9f12b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:33.98
0e7f35c5-c876-48b5-83b0-a079221068a6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:36.052
d64c63fc-a1ac-4c1b-badb-62f9cfe666d2	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:38.1
e241741f-2d30-4d5f-b5be-5ea48dfca8a3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:32:40.163
dd7f6a3a-98e1-4916-aa4e-5fdc685a2905	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:33:02.757
d3fb503f-4901-4b3d-bbc8-0e7ab3b986eb	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:33:05.17
2348ebd9-78fa-42aa-928d-df20bfdd28b6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:33:05.529
187f2ab2-021d-4791-917a-dff1099133e0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 03:33:07.507
5b0adb70-a242-42d3-af0e-f27129e18789	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 03:45:50.469
245af6ba-d53d-4e8b-bee3-159bb355b90f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 04:00:50.973
98bfd78a-648f-45b3-a1df-0fcdbeca5855	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 04:03:38.551
e6dec802-8855-4683-9528-510a899f4163	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 04:03:48.188
17451ad8-4cd3-44b0-89df-e4caa8ada169	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 04:03:58.455
ad494bee-2c16-41f9-bdd5-63b3cdc71183	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:04:22.306
a7f2ce21-1403-44ad-872e-4b5e2946ee4f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:04:24.785
319be903-23b8-4f57-ad35-fb27328a61e1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:04:32.201
2680da27-b704-4a1d-938c-1a26f86078ee	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:04:35.027
52172e8e-b8de-4fd4-8a99-9c2554eef866	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:04:35.295
487f3f5c-27f7-4524-92ea-1d0a1916a828	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:04:38.852
b5aea239-f53b-4c63-8153-53d92fdce3dd	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:07:53.871
966f412a-053f-434b-bfd3-3445e01a3045	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:07:57.298
08576607-619d-4e59-afd8-44a47469f787	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:07:57.575
a2873d74-f404-45a9-aef7-c50b74aca0d1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:08:01.252
051beb85-1944-4fe6-887e-d559c3fbe917	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:09:00.68
cd67a36a-2d72-4ab4-a29a-09356e2a9a32	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:09:04.467
909334e1-1770-4ee8-8611-79d9e71f5b7e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:09:04.787
c4583685-3c4c-4d8c-89fc-9b6d9c41855e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:09:08.335
11f48ca7-fe71-4eab-b067-6c3fbcdf6f79	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:10:29.299
73b72f0c-88bd-4bce-a041-b68a6d45d874	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:10:31.244
593e240d-1c73-4aad-8215-47e1b5550481	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:10:31.547
74450e15-c41d-481e-bfbe-7d485f7064f1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:10:35.255
3f6a2013-a83d-4eed-bee4-c7802abe2a9d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:11:18.815
8e333d15-cc0c-491d-8ee2-f2d1929fa40d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:11:20.76
e72a8782-3dff-4d46-a98f-06c8ad2a2281	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:11:21.085
6dc14e28-daac-43b8-8c0e-ade7bcfae0f0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:11:56.272
7ec1bda2-9acc-4f3b-beeb-4a3065728f29	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:11:58.167
9f9ae2f5-b53c-4899-9266-0fc37d5bff01	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:11:58.476
e3e4775a-6fe1-4068-8558-a0e1d19850ae	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:12:56.562
78d97f74-176e-4a5e-851d-821c199302d5	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:13:47.857
13e8f75e-9ff6-457a-9989-eee4b1e8e14a	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:13:49.886
82b2a192-2536-49f3-9313-78bb468d11a7	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:13:50.356
862d9f84-f5a7-4d3e-b542-771d9f25499c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:14:54.243
cc0a3dfe-d138-43c1-b57a-bd9e687fe97f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:14:56.184
46ac09ce-bf5c-49d1-bc6a-83c8a553af06	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:14:56.454
b1a83ef7-33f8-4e66-8423-4b19556e7eb6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:00.273
3dfb14d7-0f19-4c6a-809d-8ef31c29f920	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:02.201
b548eb02-88fd-44c0-9d72-6d99f7245776	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:02.496
738736a4-8989-4fa8-b53d-dfe21cdd1c62	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:06.388
bce93c68-347a-4194-94c1-fc508d511062	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:08.884
4220e6bb-1f25-49da-ae76-667a03cb39c5	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:09.17
98a99a61-28d8-41ee-92ad-eda3695988b8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:12.968
bda5e30e-7cf7-4ea6-8cf1-39e8fbfd2204	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:55.84
6fb2a3de-43ab-47dd-a122-f575591f149f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:37.104
b3c01762-218f-459f-adb6-77c254be513f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:39.103
43620f12-1e69-4b72-bc47-8ecb09ee2702	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:15:39.488
c7a4172a-49cc-4bd3-80ed-bd623ef313ff	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 04:15:56.978
2df2c963-a8b8-47b8-8fa0-251bafa4119a	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 04:16:01.52
350ce766-222e-4465-b7de-b46f01d7de2c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 04:16:02.685
4f967589-927f-4ea5-8290-14a8d0f23795	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 04:16:02.75
9f3a0893-c191-49bd-9777-ca291dc5b727	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:19:56.967
778cb05a-6733-4565-bb84-917110c1cc36	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 04:24:22.947
aad37e0c-11aa-4de7-b29e-fb1fa824d5f9	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 04:28:54.97
16fbf04c-6001-41cc-a5be-e1fca95c04a9	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:19:12.652
161fda36-fd1c-4d83-9efa-6a3d0858a05f	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:39:51.494
f18dae0a-8fa9-4c4e-a0c7-648838dc1d42	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:40:03.204
ebce7649-073f-4284-9820-b5a1b1af0be7	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	b597d809-928b-4899-bdc2-f8b7911b0824	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "FieldRegistered", "weakDuplicateCount": 0}	2026-09-11 05:40:03.279
802eb62c-99e3-4be2-9bc3-0cc263e44a65	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:40:24.887
e126f80c-cf71-4d8c-9d5d-d5158136c8b9	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:40:35.447
42a4465a-4b16-467c-aec6-31820f14ad8e	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	17263037-ef72-4413-85be-d1a3c5fdf16c	Info	::1	curl/8.5.0	{"isUnidentified": true, "registrationSource": "FieldRegistered", "weakDuplicateCount": 0}	2026-09-11 05:40:35.489
3f7681fb-664f-4f19-b659-8f210dc04a21	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:40:49.037
b6163780-4688-4629-a17a-73b3df31c95c	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	6751f0e8-cc7c-4ea0-8f45-cd8880e54ff1	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:40:49.085
07885b16-36f7-49ed-a5f4-6550c44ca003	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientDuplicateDetected	\N	\N	Warning	::1	curl/8.5.0	{"confidence": "strong", "candidateCount": 1, "candidateShriIds": ["SHRI-CVRSBF-E"]}	2026-09-11 05:40:49.178
ed872fae-7a52-41de-8ab7-88c48af67836	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:41:03.345
bdc985a9-02d6-4571-9395-b42e7d970072	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	006a691e-4a46-415f-a5be-cc44571a64a9	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:41:03.394
7bf268f0-4416-4c0d-93bd-462cf8e3e564	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientDuplicateDetected	\N	\N	Warning	::1	curl/8.5.0	{"confidence": "strong", "candidateCount": 1, "candidateShriIds": ["SHRI-BHXD2G-9"]}	2026-09-11 05:41:03.436
d1e6a881-045f-4c34-9dda-e268a2a42359	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientDuplicateDetected	\N	\N	Warning	::1	curl/8.5.0	{"confidence": "strong", "candidateCount": 1, "candidateShriIds": ["SHRI-BHXD2G-9"]}	2026-09-11 05:41:03.529
261429c8-8ea3-440e-b3cf-9e56e3a8dea6	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:41:31.478
9ace0041-80f2-4c4b-825d-aa458378199f	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	9b125f7c-0b70-4ecf-a665-3d29788a016a	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:41:31.53
6061dab7-4a69-4dd6-9f22-a56eb71e6e98	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientDuplicateDetected	\N	\N	Warning	::1	curl/8.5.0	{"confidence": "moderate", "candidateCount": 1, "candidateShriIds": ["SHRI-M3Z12A-M"]}	2026-09-11 05:41:31.61
7545e214-ca4c-4df3-b517-d3edd6da7d8f	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientDuplicateAcknowledged	\N	\N	Warning	::1	curl/8.5.0	{"candidateCount": 1, "candidateShriIds": ["SHRI-M3Z12A-M"]}	2026-09-11 05:41:31.698
921ac590-548d-46d8-a667-3189c3bb27d4	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	16f85a7d-76a8-454c-adb3-841903dfcf26	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:41:31.733
757799aa-c567-4d95-a384-e3a7ed25998b	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:41:45.607
8e76ef04-68b3-4ea2-b9a6-641153e886f4	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientSearched	\N	\N	Info	::1	curl/8.5.0	{"searchMode": "mobile", "resultCount": 2}	2026-09-11 05:41:45.671
1fb759d5-5781-47a4-8654-8bdde8ce216e	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:41:58.466
620b3803-9222-434b-841d-1a5193d05810	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientSearched	\N	\N	Info	::1	curl/8.5.0	{"searchMode": "name", "resultCount": 1}	2026-09-11 05:41:58.52
5b2b2930-cb8b-49c7-b17f-aac2c50c57a2	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:42:11.83
e3d82da1-2557-4314-aa40-9e6ff4926982	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	EncounterCreated	encounter	50da079f-add8-45f3-94fd-4ebfaf2014d7	Info	::1	curl/8.5.0	{"type": "AmbulanceIntake", "patientShriId": "SHRI-XKZ71K-2"}	2026-09-11 05:42:11.882
0f915bb2-b900-43a9-96a3-28b16ded1cd5	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:43:55.824
52c555e5-8a21-446a-a55c-40d255833463	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:43:55.924
bb01ba07-8c1b-4787-80ab-915e893e71b3	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:43:56.295
06380be3-99da-499a-90e7-7e0b2bbc3315	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "PUT", "missing": ["assessment:write:assigned"], "required": ["assessment:write:assigned"], "userRole": "HealthcareWorker", "attemptedPath": "/api/v1/encounters/50da079f-add8-45f3-94fd-4ebfaf2014d7/assessment"}	2026-09-11 05:43:56.327
d97e4fa4-2ecb-4f58-acab-a14ade5fc165	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	AssessmentCreated	stroke_assessment	b014e55d-5cc7-485b-9673-255c67c3c9e3	Warning	::1	curl/8.5.0	{"urgentFlag": true, "lkwCertainty": "Approximate"}	2026-09-11 05:43:56.393
68b4a447-eac6-4440-80f8-d9b866bafe14	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	AssessmentUpdated	stroke_assessment	b014e55d-5cc7-485b-9673-255c67c3c9e3	Warning	::1	curl/8.5.0	{"urgentFlag": true, "lkwCertainty": "Exact"}	2026-09-11 05:43:56.58
33fe0f33-4da7-49f1-8b50-86672c4fa4b0	839f3441-a924-45aa-b78c-19f64b24ef1b	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Patient", "reason": "patient_accessing_other_patient", "targetPatientId": "17263037-ef72-4413-85be-d1a3c5fdf16c"}	2026-09-11 05:43:56.648
0929b91d-9cd8-4c85-a4bd-30242eac9961	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:49:03.877
d0b3374d-e57a-45fd-962d-39b6fcdacdda	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	d562bbd5-437f-49f9-8fa7-fbc47e11991f	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:49:03.997
a3caa20c-fe6c-410f-9946-9b3b915858da	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	d2305346-950e-4d77-9490-f5e11c3792a1	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 1}	2026-09-11 05:49:04.106
7047d39d-b276-4202-b1de-d2c43345f765	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:55.302
1946f534-bb57-454a-a277-aa579efa3a1c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:55.58
0d282dba-c517-40c0-b783-1f8079a68ecb	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:55.616
c945cad6-24bc-4dba-b55b-ad25cea51928	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:55.747
82075487-5efa-411a-8957-966cb69dcc54	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:56.696
86b4a673-ede3-4ec3-8c05-eb74177103d3	839f3441-a924-45aa-b78c-19f64b24ef1b	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "POST", "missing": ["patient:create:any"], "required": ["patient:create:any"], "userRole": "Patient", "attemptedPath": "/api/v1/patients"}	2026-09-11 05:51:56.727
e7ffab1e-9165-4d8d-a36e-a884e631c006	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	c259e5a2-1f2b-40b0-880f-69003f86144f	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:51:56.77
ea57da7a-b967-4b03-8cde-7711b13e27aa	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRegistered	patient	017f141d-26be-4c7d-99bc-9878c00f9f3a	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:51:56.805
b44946b0-c9a5-4898-8026-84da093d0404	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRecordViewed	patient	c259e5a2-1f2b-40b0-880f-69003f86144f	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:56.843
9060b9f3-f021-425f-baeb-aed79b39e1cb	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRecordViewed	patient	c259e5a2-1f2b-40b0-880f-69003f86144f	Info	::1	curl/8.5.0	\N	2026-09-11 05:51:56.879
dd1067ab-6570-416f-b381-3b59d43b6b91	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:28.556
47639386-430f-4d2e-901b-f731ca88d0af	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:29.917
8b4fb9c2-0d48-4eb5-badc-5fce22edbdac	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:29.96
452965ae-52a5-4f82-9b6f-1b8134637470	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:30.123
0538482f-4af5-4c5c-8e82-d9aa225aba2e	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:30.235
150c6f37-f9a6-4272-969a-c02a0b17dd2d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:31.083
e3531659-11fc-40c9-bc6b-a99bf7d28120	839f3441-a924-45aa-b78c-19f64b24ef1b	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "POST", "missing": ["patient:create:any"], "required": ["patient:create:any"], "userRole": "Patient", "attemptedPath": "/api/v1/patients"}	2026-09-11 05:54:31.109
3d698f96-37c4-40ef-ac4b-eb161213cabe	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	0c4094ae-88e9-47bf-9ef5-5e1286a47a73	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 1}	2026-09-11 05:54:31.155
fdd13cad-fbe4-4548-b2d4-c3724d379ec6	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRegistered	patient	508641f2-5278-4808-a5e4-b9c5a75741e2	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 1}	2026-09-11 05:54:31.196
1f16d430-2000-4660-8f84-d8ed07cdb8aa	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "0c4094ae-88e9-47bf-9ef5-5e1286a47a73"}	2026-09-11 05:54:31.247
1377b86c-54da-440c-a0f6-9c7e050e5a40	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRecordViewed	patient	0c4094ae-88e9-47bf-9ef5-5e1286a47a73	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:31.283
6e049ba6-0ac9-4c1a-8584-1035a449f9e9	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:40.927
0c211755-226d-435c-ab81-a7c3daf2c727	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:42.517
651ad810-30ea-410a-b0e3-feff3556f3b3	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:54:44.911
d1bb8891-6cf6-4496-b434-a1bb1f2b0351	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "PUT", "missing": ["assessment:write:assigned"], "required": ["assessment:write:assigned"], "userRole": "HealthcareWorker", "attemptedPath": "/api/v1/encounters/50da079f-add8-45f3-94fd-4ebfaf2014d7/assessment"}	2026-09-11 05:54:44.94
90cfbcc4-3ddc-43b4-b47a-0b13edc0097c	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "17263037-ef72-4413-85be-d1a3c5fdf16c"}	2026-09-11 05:54:44.984
e86e270b-6b7e-4715-8e24-a97615e7402b	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "17263037-ef72-4413-85be-d1a3c5fdf16c"}	2026-09-11 05:54:45.022
06549879-23fe-470a-8754-7e362100e118	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "17263037-ef72-4413-85be-d1a3c5fdf16c"}	2026-09-11 05:54:45.061
478b51fe-bce1-40f6-854f-5ee92e78e363	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "17263037-ef72-4413-85be-d1a3c5fdf16c"}	2026-09-11 05:54:45.097
a489d6d2-4bd5-460c-98c5-21620c78808e	839f3441-a924-45aa-b78c-19f64b24ef1b	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Patient", "reason": "patient_accessing_other_patient", "targetPatientId": "17263037-ef72-4413-85be-d1a3c5fdf16c"}	2026-09-11 05:54:45.127
a444c77c-00a9-4985-8868-a38d7f8ff103	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:55:12.747
4e46c45d-5fb8-409a-abcf-dabdd1eed210	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 05:55:15.865
696b9806-616c-4716-9cc5-de854cdd8ba8	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRegistered	patient	a5dde8f6-79c5-440a-8bfd-5edbd9afa1fe	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 05:55:15.905
b0b4ecf6-2e50-44ac-befd-e655bcaea2b5	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	EncounterCreated	encounter	ea9c0c93-a17d-4ec6-a92e-79679471ccd0	Info	::1	curl/8.5.0	{"type": "AmbulanceIntake", "patientShriId": "SHRI-VZATKF-N"}	2026-09-11 05:55:15.949
acf47f98-3186-4516-b265-0768dfbacd22	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "PUT", "missing": ["assessment:write:assigned"], "required": ["assessment:write:assigned"], "userRole": "HealthcareWorker", "attemptedPath": "/api/v1/encounters/ea9c0c93-a17d-4ec6-a92e-79679471ccd0/assessment"}	2026-09-11 05:55:17.914
844ad039-0e51-4838-a9af-a33eaec4ec02	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	AssessmentCreated	stroke_assessment	2addc961-b63a-4979-85dc-302b5a9cbaee	Warning	::1	curl/8.5.0	{"urgentFlag": true, "lkwCertainty": "Approximate"}	2026-09-11 05:55:17.974
3abe0267-9a33-4e76-aa25-2165eee51f04	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	AssessmentUpdated	stroke_assessment	2addc961-b63a-4979-85dc-302b5a9cbaee	Warning	::1	curl/8.5.0	{"urgentFlag": true, "lkwCertainty": "Exact"}	2026-09-11 05:55:18.248
c1071bb7-6a5e-4db2-876e-fdfe3726b1c3	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:10:04.466
361d9d48-11c9-4a14-9521-b13cfad5bcbd	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:10:05.306
2281f30e-e094-466f-8f25-53c60f456273	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:10:25.895
3643ee42-f8cd-4975-bf5b-a811c692cc6a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:12:37.085
dbb0e89b-9fa0-4323-b151-4f9a075e81f5	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:13:07.463
7a30f8f0-f2cd-4084-9487-e13abb9b5ad3	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:14:19.151
325b958f-7364-4a3f-a428-10a2ae51fcd8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:14:19.461
34e80a0f-1732-418a-bb99-c88786c42da3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:14:23.38
b85e39b4-c01d-44a0-8ddb-fb4be4dc77f2	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:14:46.836
fb0a40de-68bf-4ebe-a9ef-1af33102624f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:14:49.746
9633aeca-769b-4010-bf83-1b05390b6d1e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:14:50.039
0151e0d9-97d3-42dd-b80f-663bcaaefc4b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:15:16.958
c2627b3c-d7ba-4601-8dd6-0ce52c0428ab	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:15:46.605
6e1c4020-6bc7-4c9f-9dca-2486f23a026b	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:15:48.056
f440b510-1a6c-4f54-a4f0-779da9456dd1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:15:48.22
4302c948-d310-45c0-b64e-3b81f2d9b528	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:15:52.656
67f2f6e4-ffdc-4ef5-b27f-0f9b87cab243	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:16:24.404
7a2c8454-93a6-4d66-a78f-9ff578e51a5d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:16:49.843
529129a1-48f5-4577-8f42-ed8c2275c96d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:17:03.469
7caa3207-6897-4016-b7b1-1f14fa1896b7	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:17:41.081
d2b06621-9d08-4171-a0df-7a56631a227d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:18:15.314
08644aa6-d801-485b-8233-779c6c9e376d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:18:37.959
f5bb9b87-b6b2-4d61-bd17-596c76a3b2b5	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:25:47.118
33f40fcb-db7d-43b5-9339-9ef8a9e014da	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:25:48.398
33e64d9e-ed43-49dc-b474-494f3e24d53d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:25:48.423
98cd1dc3-1ccb-4058-b1fb-761018b2856d	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 1}	2026-09-11 06:25:48.684
ed8ff98c-ab40-4f8e-9ee3-9a1bea2cb2cd	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:01.579
d1af2187-23cd-4b85-892f-204f6cdad2ae	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:02.834
6131806d-07c9-4bac-ab9c-d67b729ebdfa	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:02.859
9d3084c6-cc0f-46e3-86ea-e9fbf57bf404	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:03.627
e6ba8d8c-2d4b-4e1f-8bc8-ed9c1370c278	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:04.887
52d8f98d-7866-4f72-b953-1ef8f5ce20d4	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:06.638
294d5749-5b40-46bd-9de5-c501751af0b7	839f3441-a924-45aa-b78c-19f64b24ef1b	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "POST", "missing": ["patient:create:any"], "required": ["patient:create:any"], "userRole": "Patient", "attemptedPath": "/api/v1/patients"}	2026-09-11 06:26:06.658
4cd8c23d-9db2-4dcd-8c45-3973e93d2617	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	21c72798-b355-4108-8c88-5b4b709efec7	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 06:26:06.689
a0f946d8-940a-45e4-820b-07561c4059ba	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRegistered	patient	7b3833e3-0ab6-4002-85cc-9a1795874d54	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 06:26:06.715
74c82c93-8074-4e14-9d9d-a64156734db3	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "21c72798-b355-4108-8c88-5b4b709efec7"}	2026-09-11 06:26:06.75
f3c06544-2879-4616-963b-1047a06b63af	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRecordViewed	patient	21c72798-b355-4108-8c88-5b4b709efec7	Info	::1	curl/8.5.0	\N	2026-09-11 06:26:06.771
98dbf79a-3713-4b7a-80a5-0816c7f4df2c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:28:23.291
fd2e2320-0316-4f1c-a734-6189d122cc3b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:30:58.967
291f6c59-cebe-42b5-8383-b429a0672805	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:32:03.876
001a1f90-0f65-4c1e-855d-59d85e7b735a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:32:06.95
5266e905-d1c9-4077-89a8-4844d8a1a6ed	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-11 06:32:13.958
5584c6e3-a735-4cd7-9084-a4c1cc3cc570	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:33:37.031
cdf8573f-173e-497b-b387-984ee46b4512	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:30.727
6ecc5e71-be64-4f85-8a82-c935c386be57	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:31.926
7be23bff-82c9-4a2a-af3e-df0af4bb8fc6	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:38.433
61f39e20-5e6d-4e3a-affb-f28d35221187	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:43.292
d25cbe89-7e08-4d14-a1e8-e329c290c9ec	8250825b-8ed2-4879-bc56-25d409f3cbe8	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:47.171
d8517fe0-2575-4ee1-91b1-7fd1fe3c61d2	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:52.462
4da3f381-2ce0-4e8f-95db-e525e95cdff4	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:42:54.907
68e55e7b-89f5-4ca1-b44e-04266e0bd4a5	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:43:03.447
6dff75b7-6f44-4378-aa8b-84ad9caf846b	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:51:39.766
c2948b8d-4c00-46b2-9aea-d19bc503188d	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientSearched	\N	\N	Info	::1	curl/8.5.0	{"searchMode": "name", "resultCount": 0}	2026-09-11 06:51:39.831
0a521925-a286-4f12-87e4-52471a43f29f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 06:54:04.918
7d22d991-8832-4db4-99a2-2a6a96c5f08f	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:54:52.607
ce8d824b-f8f3-439e-8909-1ce6def14633	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	477fc237-def2-4c60-b195-6b2f10db1f67	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 06:54:52.681
20ef1861-ff61-4099-a463-63fa2c524270	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	EncounterCreated	encounter	e27d390c-9b9a-471d-9c48-67ff23fd4b82	Info	::1	curl/8.5.0	{"type": "ClinicVisit", "patientShriId": "SHRI-CQH40B-P"}	2026-09-11 06:54:52.801
a30ef468-492a-46ef-8eba-03e507ee0ec0	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:55:47.515
2ca6d205-aafe-448f-82e6-4e3ad4959d39	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	0dacb359-6eb7-4f9c-b8a0-1ffebd0d305c	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 06:55:47.565
e27d65fb-dce3-43cd-a34a-eac12e78aa83	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	EncounterCreated	encounter	c0bc4428-bae3-4ea9-923e-1f960cd916bd	Info	::1	curl/8.5.0	{"type": "ClinicVisit", "patientShriId": "SHRI-GRR8HR-C"}	2026-09-11 06:55:47.669
7f9270d8-f748-4939-8a43-7a1353abe647	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:59:12.37
16b5ef44-29d1-4bcc-ae6f-0f246160ea41	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	0feb0f0f-4ea2-446e-879e-ea1d384f463a	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 06:59:12.445
19de0a50-6497-4fb5-8371-a4e6a04a78bd	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	EncounterCreated	encounter	7d3d40c5-13b7-4c9d-a8ba-faaa2bcf8ad2	Info	::1	curl/8.5.0	{"type": "ClinicVisit", "patientShriId": "SHRI-BBT5FD-4"}	2026-09-11 06:59:12.614
d205c249-d2ff-499b-9c7a-d81830b7d1ca	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 06:59:44.717
b7bd42aa-8fe2-4f4c-975f-92f53aed322e	\N	UserRegistered	\N	\N	Info	::1	curl/8.5.0	{"role": "Patient", "email": "gate.selfreg.test@stroke-ai.invalid"}	2026-09-11 07:01:52.95
d14af536-1a84-4a01-80d5-cfb49b9c791e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 07:10:14.083
3f1bcc30-e977-45c3-aa5e-c2f775daf010	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:31.238
e894d436-daa8-4644-ae0b-19f82e0f8f64	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:32.759
7da7ddf1-79de-463d-b1d1-3afed07faa45	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:32.813
203c6f01-5ccd-43c3-bef9-fa062d764429	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:33.419
30e8085b-7e39-405a-94c0-4e57f4d2b61b	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:34.235
ac7ffa5d-1bd8-4f16-9552-6880de5f05dc	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:35.443
42924ce9-c5d1-4af9-ae69-27e6a1007dab	839f3441-a924-45aa-b78c-19f64b24ef1b	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "POST", "missing": ["patient:create:any"], "required": ["patient:create:any"], "userRole": "Patient", "attemptedPath": "/api/v1/patients"}	2026-09-11 07:14:35.477
84f5907f-629a-438d-8ad7-0543315359a9	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRegistered	patient	3f7593b1-5b81-49d6-a6ef-395c5ed3a103	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 07:14:35.533
7675758d-af38-43df-acd5-fc45dfd8e94d	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRegistered	patient	e2fc5966-a5fa-401d-9cc7-391b29da3fbf	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 07:14:35.581
2871e34a-341d-4459-910c-e31cf4b53128	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"role": "Doctor", "reason": "clinician_not_on_care_team", "targetPatientId": "3f7593b1-5b81-49d6-a6ef-395c5ed3a103"}	2026-09-11 07:14:35.652
0adb6365-b079-4334-8552-7b0479ab8b6f	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	PatientRecordViewed	patient	3f7593b1-5b81-49d6-a6ef-395c5ed3a103	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:35.702
41acbc4d-9203-4781-aeaa-2bc21d8c2ab5	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:45.947
a32687ad-23a8-41bf-8402-3d82ad753a4b	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-11 07:14:48.287
14c2eed6-d664-4441-8a90-a322cfe6f082	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	PatientRegistered	patient	efcdade5-a7cc-4390-ab25-466081c9bc9e	Info	::1	curl/8.5.0	{"isUnidentified": false, "registrationSource": "StaffRegistered", "weakDuplicateCount": 0}	2026-09-11 07:14:48.341
0102d041-31d8-488b-8ebc-027003772acf	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	EncounterCreated	encounter	ef5ee2cf-720c-4ff2-aae3-613bc5c5161f	Info	::1	curl/8.5.0	{"type": "AmbulanceIntake", "patientShriId": "SHRI-315B0X-2"}	2026-09-11 07:14:48.402
f0498c1e-c8e8-4613-bf34-92dae81c2b58	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	UnauthorizedAccess	\N	\N	Warning	::1	curl/8.5.0	{"method": "PUT", "missing": ["assessment:write:assigned"], "required": ["assessment:write:assigned"], "userRole": "HealthcareWorker", "attemptedPath": "/api/v1/encounters/ef5ee2cf-720c-4ff2-aae3-613bc5c5161f/assessment"}	2026-09-11 07:14:52.091
58c447d5-6e3b-4058-b110-39fc31139bb2	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	AssessmentCreated	stroke_assessment	b273e019-755d-4f61-9686-f3b4ebd569f0	Warning	::1	curl/8.5.0	{"urgentFlag": true, "lkwCertainty": "Approximate"}	2026-09-11 07:14:52.199
1a82b55f-816a-40ab-a812-d6d8990e902d	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	AssessmentUpdated	stroke_assessment	b273e019-755d-4f61-9686-f3b4ebd569f0	Warning	::1	curl/8.5.0	{"urgentFlag": true, "lkwCertainty": "Exact"}	2026-09-11 07:14:52.503
59bae34f-7159-40ef-8a9f-659759604ab7	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 07:16:31.954
71e08101-644a-481e-904d-cb4015da7795	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 08:51:14.521
3b7f8abc-cec4-4524-9169-c8020b8dcb64	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 09:07:04.988
512afd8f-a508-446b-bb15-06d20517e8b8	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 09:22:27.918
883eb25d-10d3-4e37-b338-4317989b1fcc	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 09:38:14.14
7c6021cf-9b71-49e3-9223-0e0bb9731dab	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 09:54:14.01
6812e3de-c623-4b97-9d3c-9ddd90d54054	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 10:10:14.048
59345d8c-21e8-4c26-98f8-b7a84965d937	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	2026-09-11 10:10:29.997
dd64db87-49cf-4c51-a590-ca3164ec0f3c	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 09:15:18.213
0900651b-30e8-43e7-b52b-224e25783def	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 09:30:18.598
4b69c4a7-fcd7-429e-8e3f-af1e8008922e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 09:46:00.128
2543f6c5-190e-459c-9d30-7154a1fe4c68	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:01:00.126
99e42827-2fe7-4c1a-a4f0-be30e00bb2ce	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:04:51.595
4a9d5b17-c020-4051-b4ee-0f6f5ea5d06f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:10:30.198
fd8d479c-6c81-4e2e-b18b-6703bb1d4ae2	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:10:40.826
6f351aee-76b2-4185-a448-2ef529dad499	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:24:03.951
2694adae-2405-4d63-8225-fcb5b87f2750	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:26:47.577
11435656-a524-4a6b-beed-f17b23e837f9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:27:52.774
3e235b7a-254f-4f58-b759-e263f7af8ca3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:28:27.623
10595870-4bcb-4cc1-bf07-1d9d5269e0ff	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:28:42.199
b57fbd01-75d0-4a6a-b1b5-99ff1cb29342	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:28:54.663
e849c60c-5762-498b-8776-c729115b9e73	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:32:24.258
59278074-605a-441c-877c-1867481ed640	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:32:30.767
9d3e5e06-3ffe-4bb7-b1d1-391a25df7c81	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:32:57.752
0420f09c-2233-47d5-b794-7ba4d1fb7214	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:00.767
3cb33b99-745b-4f17-ba9b-2cc1369a4de1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:03.789
e81ae5f5-e83e-450d-a045-b3d9b3b7ff06	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:06.806
2a91bfbb-d03b-4005-be1a-2335fabe24ac	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:09.838
40180bc2-08da-4229-b107-a6c62d454d82	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:12.851
b77fd957-89ce-40b7-8c3a-4654d2e5ceb4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:15.881
c5e34e3a-1e02-4fca-975a-73df66bdf010	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:33:18.894
6e9b1d13-2eec-4e65-ab47-91bb6ff14ee0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:36:58.456
54f72190-ee1a-48b4-a3c1-eeba1d175c3e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:37:01.405
5c809730-c33f-4c3b-bb21-8618c487c3b6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:37:19.295
4499958e-bb91-44f0-ab93-087ce6c64df2	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:37:23.494
89418dbe-d36b-4191-ba0c-dd8af84df629	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:37:37.014
d93b2cb3-5b8a-4fcf-8505-3b6ccf49bad9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:37:58.917
d810683f-2601-43a4-aa88-0a6ab05c083d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:38:04.415
4a1e582e-b2ec-41fc-9fe9-3fc90b1ebdf3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:41:20.246
16b18b31-167f-4000-b28f-54eec008ea01	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 10:41:24.935
bc844978-87d2-4926-9aaf-5449c7fdb2d4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 10:43:11.528
9c0d4c3e-2a20-4ef8-bcdc-9b0b88fdcbe3	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:06.211
d080e72b-5210-4c5f-a493-4ac253985be5	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:06.447
4def6479-150e-4ebd-a50b-df7a701cac6b	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:06.747
13088d1a-9366-471c-b854-45a0adbf65b2	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:07.016
59cb7808-9694-4a95-9397-890fb6250db4	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:07.203
0427af72-ed7a-4734-9c1b-00fbca69595d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:07.38
d5e2e60b-fb15-4dbb-9c42-f0d7ed447621	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:07.685
fde61861-42af-4f79-afba-ee3b9c989376	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:07.951
f8c4301c-dc79-4ea6-a830-2b7c83039e22	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:08.264
1f3771c0-cd39-4ae3-8c4d-ca3028940b7d	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:08.609
84c735b8-0763-476f-9e2a-6ea567cdb040	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:08.964
0456ec27-1eb9-41f6-a190-6b45d8de9f88	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:09.287
4e9293b4-f8a3-4c70-afb5-ec29e85245a7	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:09.646
e7e973e7-6928-4071-b004-d97cf260a1ba	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:09.969
42667fb1-3613-4bb2-a077-98b4600d4ad6	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-17 10:59:10.269
d115af19-4454-44e9-bb81-776e14c48a0e	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 1}	2026-09-17 10:59:18.495
b1f4e197-7ad2-4cd5-9ddc-a599b70ef251	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 2}	2026-09-17 10:59:18.677
d4182194-3fa1-470b-a2a3-848a12243fd7	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 3}	2026-09-17 10:59:18.841
19822565-e61b-4719-9e5d-61a11fb3713b	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Warning	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": false, "failedAttempts": 4}	2026-09-17 10:59:19.494
e03ad751-88c3-4fc8-8477-0f4fce5e136c	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 5}	2026-09-17 10:59:20.627
6f569c3e-fadb-4c21-8011-ce784abf382f	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 6}	2026-09-17 10:59:22.308
16e4f14c-3a76-4c80-b6d0-e15f7eb5b523	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 7}	2026-09-17 10:59:24.559
926206b9-db98-47ff-84d8-a3a9c92e5375	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 8}	2026-09-17 10:59:27.249
019f25e2-9ced-4748-9d42-e4d920189783	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 9}	2026-09-17 10:59:30.462
c059995b-abc0-4ce6-860e-773ffe2d9883	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 10}	2026-09-17 10:59:34.12
33111ca4-b34a-4d08-9957-7084637a196a	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 11}	2026-09-17 10:59:38.3
8d1ad94b-911f-4d15-8516-61a8da2baf1b	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 12}	2026-09-17 10:59:43.029
2b6ff321-c1bb-4172-9c5b-2dc5eb82ab03	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 13}	2026-09-17 10:59:48.884
a3fb7d3e-4d7b-4a47-b8cb-d8b141860d07	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 14}	2026-09-17 10:59:55.036
e1af2d35-c79c-460f-a0fa-852d548c3853	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 15}	2026-09-17 11:00:01.872
c8296634-9424-45b1-8b27-5442e5b269ef	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 16}	2026-09-17 11:00:09.061
aed82efc-f31b-470e-8b0a-e1b89fd64ef2	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 17}	2026-09-17 11:00:16.887
43593a4a-cfbd-4fd4-859b-e271acdf4e0e	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 18}	2026-09-17 11:00:25.058
27947ce4-d69d-4179-8bcc-3211d7fa4ed4	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginFailed	\N	\N	Critical	::1	curl/8.5.0	{"reason": "invalid_password", "accountLocked": true, "failedAttempts": 19}	2026-09-17 11:00:33.834
0362fcb8-9ad4-465c-b11e-6a5a7cbf20b4	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:01:49.965
7739fa84-0853-46d8-a85d-fea32ac3b474	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:01:50.004
bbca6de9-321a-4d18-8c7f-9640629c0c16	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:02:08.651
3bc6ab27-1cff-450c-998e-1a7800f873a5	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:02:08.658
b14ecbe1-5474-4708-b4d1-32a154f0d4be	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:05:51.717
3a046ea3-48a0-4750-8607-e65b6e8e5f6f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:06:00.526
74ae73b8-cf47-4b60-94c6-64c8fff04525	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:07:41.508
cf32b559-cdf6-4597-9231-188908f8333c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:09:54.466
ac89565d-70c2-4050-a141-be8684960d32	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:09:58.384
f15cb6b1-1e53-463e-aa0f-c901235a8d09	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:02.259
ccbb21bd-bbd7-42b0-ad2a-bf8921bff3e9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:36.957
44961b3a-d98a-4769-ba11-4d484da92f2d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:42.156
4dcdd3d8-d4c9-4483-9147-89b511dc651d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:44.765
5a92b5b3-2a6e-49c8-af98-4290522d9c8f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:47.384
c4dc24dd-8afd-403d-8e9e-685772d74400	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:50.004
4c0d2efb-d1b3-48b0-8359-0945b7e44d73	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:52.634
a3cd25c1-ebb7-4125-95d2-0c1b4966e185	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:55.254
f898ca47-6f4a-4086-80be-8fb90636d0fa	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:10:57.871
425365f9-e336-4533-a084-5cfd1bb1211c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:11:00.494
77987a29-57a6-4160-ab6e-f4ae616b08d9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:11:03.133
cd67099c-1014-4ed0-8bef-8dcd0793e6af	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:11:05.728
dd4b03cd-4fe8-43e5-acff-603973aba2da	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:11:08.355
066c4e13-05de-4304-b15a-a02e0cdfa64e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:11:10.966
92ffe596-ef6c-4ee5-af3e-d5947e24c756	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:11:21.664
6759f352-43b7-491a-84d3-f79a99566984	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:19:37.258
413cc720-20b7-4485-9bb3-9bccdde5226f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:19:37.413
1509270b-e7c3-412b-8024-9b15c1f8ef42	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:19:37.645
82397efa-59bd-47aa-a39c-2a415e6352d3	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:19:37.795
efd546f1-8706-4299-b2fe-a487e42b1e09	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:20:47.586
1316a619-767c-4f49-b531-3f97282ef60d	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:26:22.045
c0c1d412-1baf-4d93-a660-c57275becddc	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-17 11:31:22.028
6765d105-d03c-4607-8210-9350ca712c3e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-17 11:36:40.001
3dd28087-56d0-4c08-a7fc-250b830f9365	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 04:12:01.854
ba4fc402-bd2c-4113-a377-d9da599470cb	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-18 04:17:41.086
1433bc40-ce20-4735-be38-9fc583229708	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-18 04:17:49.08
d15f9fb4-e9f8-45ce-8b29-323336032f79	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	curl/8.5.0	\N	2026-09-18 04:17:58.309
11d64a4a-612e-4158-85cc-079b798b2b02	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:22:13.815
9c5d7c2e-b5cd-4adc-88d5-5b452c5291af	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:22:31.507
80f76a27-14f9-432c-aa01-cc3e4bf2647c	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:23:49.891
01afca18-4d2b-4ee5-b8af-cbea02a0e4fa	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:06.514
df67f938-f14d-4ba9-8ec0-fcf588f3a5bd	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:08.974
68d6cf1f-bd52-431a-93a6-6bab4a636400	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:11.606
7849457a-f717-4760-ad21-7b73f0a71530	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:14.202
5d866722-c698-4170-b8ba-a6522ec2e9f6	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:16.849
c656c1c9-a3a6-4b84-9357-5092239706bc	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:19.467
c1fc0638-4c6c-4b81-bbae-f3e0f4c49dbd	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:22.079
2fc61a55-28a1-4f1c-8e87-2a00f4d1e985	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:24.726
d7c2cffb-8dfc-44aa-b4e8-0279e71409fd	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:27.339
a039809b-8825-4493-9bd5-1b66a52dcc2e	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:29.981
ef7f6977-237d-4a11-8ecc-9d8f27b43d5a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:25:32.626
9f6e8294-f4b6-41bb-a9c2-9de3176fc60a	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 04:27:03.183
e18b2dfd-a8f9-4411-9096-c4d42e564cb5	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:30:14.487
f1ad4631-ec81-4a2a-9f20-8c7473f3550f	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:30:34.936
225a77f1-d544-4253-9094-7a5b104b63d0	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:32:59.306
0aa6b7a6-a8bc-45bf-b496-584776e1ec6b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:33:29.091
6ead579d-af40-4249-aa12-e0e87cc3c66b	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 04:42:43.138
a007229d-7aa8-432e-a989-ab3fc90802c1	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:48:29.536
0785d390-c8df-49cf-848d-80d6c178cb13	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 04:48:35.117
53b5d69e-1dd4-4d5d-abfe-f37d5977c2af	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	\N	2026-09-18 04:53:29.488
7187cd4a-f484-4e2b-a139-92e83be6be17	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 04:56:42.713
96245a00-2fb2-4e44-8db7-0b825a6114a9	839f3441-a924-45aa-b78c-19f64b24ef1b	TokenRefreshed	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 05:11:43.169
8fb67255-d864-4b7b-8729-2af48ca0af0b	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 05:17:00.13
9c153302-d2a1-4115-99e2-6d2a6af8e8b5	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLoginSuccess	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 05:21:27.211
0bc3d376-e4ef-43e4-be56-8a88b456b340	839f3441-a924-45aa-b78c-19f64b24ef1b	UserLogout	\N	\N	Info	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	2026-09-18 05:28:32.175
\.


--
-- Data for Name: care_team_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.care_team_members (id, patient_id, doctor_id, care_role, is_primary, active_from, active_to, created_at, updated_at) FROM stdin;
569766b7-1f39-4db4-8865-1568976c9a8a	0cfddff2-a875-486a-b156-cd9c70cf5e83	2096befc-1265-4e87-9809-460345b64071	Primary Neurologist	t	2026-09-10 08:47:03.803	\N	2026-09-10 08:47:03.803	2026-09-10 08:47:03.803
a17a3cd4-f79d-4687-bcc8-3c0112347216	0cfddff2-a875-486a-b156-cd9c70cf5e83	aa320f6b-d1f7-4e1d-960f-697965a81715	Physiotherapist	f	2026-09-10 08:47:03.809	\N	2026-09-10 08:47:03.809	2026-09-10 08:47:03.809
bfa9e542-2058-43cd-b98e-543ea36e5df1	0cfddff2-a875-486a-b156-cd9c70cf5e83	2b5b1081-cb01-4491-870b-8385c0a8cb1d	Rehabilitation Physician	f	2026-09-17 11:09:16.979	\N	2026-09-17 11:09:16.979	2026-09-17 11:09:16.979
f9586355-6fe9-4198-ba5b-61affdbeae2c	0cfddff2-a875-486a-b156-cd9c70cf5e83	cf710288-3070-47c9-a1f2-5006f32399fa	Speech & Language Therapist	f	2026-09-17 11:09:16.981	\N	2026-09-17 11:09:16.981	2026-09-17 11:09:16.981
\.


--
-- Data for Name: doctor_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctor_profiles (id, user_id, first_name, last_name, gender, registration_number, hpr_id, specialty, qualifications, hospital_name, years_experience, is_verified, verified_at, phone_number, profile_photo, deleted_at, created_at, updated_at) FROM stdin;
2096befc-1265-4e87-9809-460345b64071	d8f89293-57a8-4efe-9496-4147905f5dfe	Priya	Nair	Female	\N	\N	Neurology (Stroke)	MBBS, MD (General Medicine), DM (Neurology)	IndoStates Health Hospital, Coimbatore	14	t	2026-09-09 10:22:24.366	\N	\N	\N	2026-09-09 10:22:24.368	2026-09-10 08:47:03.528
2b5b1081-cb01-4491-870b-8385c0a8cb1d	2e0139cb-5abe-4705-8971-0f5406e78cc8	Karthik	Raja	Male	\N	\N	Rehabilitation Medicine	MBBS, MD (Physical Medicine & Rehabilitation)	IndoStates Health Hospital, Coimbatore	11	t	2026-09-09 10:22:24.378	\N	\N	\N	2026-09-09 10:22:24.379	2026-09-10 08:47:03.538
aa320f6b-d1f7-4e1d-960f-697965a81715	a0a8bb57-bc87-4aeb-b8d2-09aa42ba6380	Anitha	Selvam	Female	\N	\N	Physiotherapy	BPT, MPT (Neurological Physiotherapy)	IndoStates Health Hospital, Coimbatore	9	t	2026-09-09 10:22:24.386	\N	\N	\N	2026-09-09 10:22:24.387	2026-09-10 08:47:03.547
cf710288-3070-47c9-a1f2-5006f32399fa	c1537b1d-fabd-4d07-9b87-cf6f045108a8	Senthil	Kumar	Male	\N	\N	Speech & Language Therapy	BASLP, MASLP	IndoStates Health Hospital, Coimbatore	7	t	2026-09-09 10:22:24.394	\N	\N	\N	2026-09-09 10:22:24.395	2026-09-10 08:47:03.557
20270b3c-004b-4ea6-9fb0-d30f4e98d4bd	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	Test	Clinician	\N	\N	\N	Internal Medicine	\N	\N	\N	t	\N	\N	\N	\N	2026-09-11 05:39:41.879	2026-09-11 05:39:41.879
\.


--
-- Data for Name: encounters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.encounters (id, patient_id, visit_id, type, status, started_at, ended_at, location_name, created_by_user_id, appointment_id, chief_complaint, created_at, updated_at) FROM stdin;
5822a038-1ba1-4296-afef-f0ac9dffa1d4	0cfddff2-a875-486a-b156-cd9c70cf5e83	ENC-R05EX7-Y	Emergency	Completed	2026-06-25 02:10:00	2026-06-25 08:40:00	IndoStates Health Hospital — Emergency	\N	\N	Sudden right-sided weakness and slurred speech	2026-09-17 11:09:22.795	2026-09-17 11:09:22.795
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, body, action_url, read_at, created_at) FROM stdin;
6b38857e-2572-4178-a978-9982c57e6043	f863144b-4b2a-4174-bb49-8fdf784cf731	Appointment	Appointment requested	We have received your request for 17 Sept 2026, 9:00 pm. Your care team will confirm it shortly.	/app/appointments	\N	2026-09-09 10:31:44.978
e57cf6d9-3fbf-491d-a9bb-5ff9333d5a74	839f3441-a924-45aa-b78c-19f64b24ef1b	Appointment	Appointment confirmed	Your physiotherapy video consultation is confirmed for 20 September.	/app/appointments	2026-09-08 08:47:03.813	2026-09-10 08:47:03.848
91b191a9-a13d-47e7-9bb4-afdf1b6a17f9	839f3441-a924-45aa-b78c-19f64b24ef1b	CareTeam	Care team updated	Dr. Anitha Selvam (Physiotherapy) has been added to your care team.	/app/care-team	2026-09-05 08:47:03.813	2026-09-10 08:47:03.848
f39d7524-b0d9-4b46-a1e2-c39f9ca900c0	839f3441-a924-45aa-b78c-19f64b24ef1b	General	Welcome to Stroke AI	Your account is set up. You can review your health information any time under My Health.	/app	\N	2026-09-10 08:47:03.848
a8ece046-6adc-4f5d-be9c-85eb965b653d	839f3441-a924-45aa-b78c-19f64b24ef1b	Report	MRI report available	Your brain MRI report from 12 August has been added to My Health.	\N	2026-08-15 06:30:00	2026-08-15 03:30:00
9e23c12d-4556-45a6-b14d-e6058e99a0e8	839f3441-a924-45aa-b78c-19f64b24ef1b	Medication	Medicine added	Atorvastatin 40mg at night was added to your medicines list.	\N	2026-08-18 06:30:00	2026-08-18 03:30:00
2f0e4537-57dc-4fd9-baf6-e9128e654e06	839f3441-a924-45aa-b78c-19f64b24ef1b	CareTeam	Speech therapist assigned	Dr. Senthil Kumar has joined your care team.	\N	2026-08-20 06:30:00	2026-08-20 03:30:00
ee25b431-bc74-4f15-a411-58b0dee7ea8e	839f3441-a924-45aa-b78c-19f64b24ef1b	Appointment	Appointment completed	Your medication review on 3 September has been marked completed.	\N	2026-09-04 06:30:00	2026-09-04 03:30:00
fb5beb1a-d72b-4abd-8ea3-045bd2c41754	839f3441-a924-45aa-b78c-19f64b24ef1b	General	Blood pressure log updated	Three new readings were recorded in your health history.	\N	\N	2026-09-12 03:30:00
a59f09da-7761-42be-9058-c7e6ae49ba06	839f3441-a924-45aa-b78c-19f64b24ef1b	Appointment	Upcoming: rehabilitation review	Dr. Karthik Raja will see you for a progress review.	\N	\N	2026-09-16 03:30:00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
d1efa3bb-9f52-4de3-bbfd-a1e059cd6498	8250825b-8ed2-4879-bc56-25d409f3cbe8	7b70804ad868116435ee637a48531d1b3eb79b0d98d63f2dc63f45f1df3ec0c3	2026-08-07 06:00:25.432	2026-08-08 05:07:18.104	2026-08-07 05:45:25.436
af03b39f-bd94-494e-879a-e0e2f4b2cf99	8250825b-8ed2-4879-bc56-25d409f3cbe8	4dac21ad7ab45a6af5d34078ac9ebea432c61e3981039124095e53c423543fa8	2026-08-08 05:22:18.101	2026-08-17 05:31:08.709	2026-08-08 05:07:18.113
e6ea288e-a48d-4e4a-8fe9-618862b09e0e	8250825b-8ed2-4879-bc56-25d409f3cbe8	f715b226c34ae2717b9ad414a752bbe22083491902edfc9b62de2e705578c388	2026-08-17 05:46:08.707	2026-08-17 06:17:23.907	2026-08-17 05:31:08.714
e8ee824e-2c6e-466b-bde7-147b9150720e	8250825b-8ed2-4879-bc56-25d409f3cbe8	16a0f08ddb205a2de9311eac6f517b270c515541c8abb9347ad4c667e2c6b578	2026-08-17 06:32:23.906	2026-08-17 07:48:29.45	2026-08-17 06:17:23.91
ea4995fc-a270-44e3-aace-df27a65b8223	8250825b-8ed2-4879-bc56-25d409f3cbe8	c0bd1b6995385bb3b2d1e690a784ffd77c88023812f8933c76c3ffb9f6fbeab0	2026-08-17 08:03:29.448	2026-08-17 07:51:52.892	2026-08-17 07:48:29.458
a3544514-47e1-42a6-bd96-f390c53295bb	8250825b-8ed2-4879-bc56-25d409f3cbe8	d692b47234c3cde2c2bcadaabfd33f7e79e171320d5f48562bf4d54f53c95c94	2026-08-17 08:06:52.891	\N	2026-08-17 07:51:52.896
\.


--
-- Data for Name: patient_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_profiles (id, user_id, first_name, last_name, date_of_birth, gender, phone_number, address_line1, address_line2, city, state, postal_code, country, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, deleted_at, created_at, updated_at, abha_id, alcohol_status, alternate_phone, blood_group, current_medications, district, existing_diseases, family_history, known_allergies, marital_status, middle_name, occupation, passport_number, physical_activity, previous_surgeries, profile_photo, smoking_status, tobacco_status, village, aadhaar_last4, abha_id_hash, preferences, shri_patient_id, phone_number_hash, dob_is_estimated, registration_source, registered_by_user_id, identity_status, is_synthetic_data) FROM stdin;
c8d9c92d-c667-4fd4-b116-d340f3b5c9dd	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	Anand	Jyothis G	2026-08-04	\N	BnQPtgj4UHIbFNKH.idb/Pw45oip9dh+1NxWuKQ==.K7lYT0cSnJyuH95rhVQ=	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-08-08 04:52:26.952	2026-08-08 04:52:26.952	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHRI-6NX6NG-V	9886b840f08c15cd60a82e5fded59032f0434fd4280488e9671ca04ae31ddc1b	f	SelfRegistered	\N	Unverified	f
0084af99-c833-4f60-b311-1af23f3010a2	f863144b-4b2a-4174-bb49-8fdf784cf731	Anand	Jyothis G	2026-08-06	Male	gnemQPxd099r/MKA.D06JGeaHJeL/y6wT3Yg3og==.gB5rx9BF/x9J5+FZDe8=	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-08-24 05:01:15.48	2026-08-24 10:48:28.97	\N	\N	\N	A_Positive	\N	\N	\N	\N	\N	Single	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHRI-5Y9Z83-H	9886b840f08c15cd60a82e5fded59032f0434fd4280488e9671ca04ae31ddc1b	f	SelfRegistered	\N	Unverified	f
aa66c5ed-847f-4d82-a5dd-ee38c530c055	67d1d7a2-3dee-498b-8e08-f7b16896ed2f	Test	Patient	1990-06-15	\N	\N	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-07-28 03:59:10.688	2026-09-10 11:14:35.299	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	SHRI-J6JCSP-0	\N	f	SelfRegistered	\N	Unverified	f
3703969e-3aaf-425b-92d1-587eefb4176e	c45486ee-7c9d-4005-9909-a2f7b52ff2c8	Test	Patient	1990-06-15	\N	\N	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-07-28 04:17:14.359	2026-07-28 04:17:14.359	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHRI-XWVBQE-G	\N	f	SelfRegistered	\N	Unverified	f
588c91dc-fc29-4741-9488-aac3d6d088d3	1e942aea-1b44-43eb-a0f2-52eb6c79af0f	Rajesh	Patel	1985-05-15	\N	\N	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-07-28 05:04:56.87	2026-07-28 05:04:56.87	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHRI-4RF6EG-2	\N	f	SelfRegistered	\N	Unverified	f
85402e56-d7b8-4d33-bd09-5b3f93190fb4	8250825b-8ed2-4879-bc56-25d409f3cbe8	Anand	Jyothis G	2006-02-07	\N	\N	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-07-28 05:15:49.515	2026-07-28 05:15:49.515	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHRI-45R4G2-5	\N	f	SelfRegistered	\N	Unverified	f
cf919873-2695-4df0-a598-a861f7e08d67	44e80ca0-5f14-4de5-9739-0fcd837f0054	Test	User	1995-05-15	\N	Qirbh4YgKxoSNyXD.zQ7UGR9Wt6Ho0HxzEbTTCw==.qNoQf33Bib1VBoK//hw=	\N	\N	\N	\N	\N	India	\N	\N	\N	\N	2026-08-08 04:48:47.546	2026-08-08 04:48:47.546	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHRI-C5ZMNR-7	f0ebd3ae3eeccfee74462476c028674dfb477e4d34179c020b955b7e31d143eb	f	SelfRegistered	\N	Unverified	f
0cfddff2-a875-486a-b156-cd9c70cf5e83	839f3441-a924-45aa-b78c-19f64b24ef1b	Meenakshi	Subramaniam	1969-11-03	Female	eBSUbpU2IRTptQ7O.YTFKN5gGHumUa8rxneR50Q==.pShUbRjWDd6tmY4UqIY=	v9u4QU1Lgc+xUVk9.8Kre3j/F+pXnGONWYLYUEA==./LtWy0oGLZVrQadaI8BZKvQpyU78mCi2e1xVwg==	kxLxs/VQaqC6Twgu.H4DgRhPMGP9f0HlkYSBSdA==.iaAh8YmMOunkzDHbEn+ULLrUtHj8z3qsxGA=	mqnqySfmlOPyy/pA.EISFkzJCKb/kbTskHS2MAQ==.yIBW1LU5CEvg2g==	WZfnF3c7kPdsfK34.5GtiWPSOr66pXTG8X4m8nA==.28Ae+FvVifDwjQ==	ZIgdrmKwvaWDZR3U.YgEK9HwFY/+iQjlJeRzkWw==.E0mbkghG	India	f5UdY/rOBQceSKxb.iJKqv7RrBQ8IizhuZB0Vfw==.AAZ5ORDlo+NZiNmyMr/m80fjOw==	JratExmRVovYJQ3Y.+3wa3AYxTkexdXeM9nPuqg==.c1ZujdoB79ZpKOpN4GI=	/GdzTZCMtfXYdKp/.My7u9AZUP9UblqPDthd94w==.eHFaR6pU	\N	2026-09-10 08:47:03.789	2026-09-18 05:27:54.845	ZUrvRzrN4879KlFe.8EgIU+GwI7exLyb6qps1Ig==.HqMXAofi8YqQvrF70ocCc8I=	Never	nTzC1YlEC2SSQtCC.8ogVfP7IVyaGHcrAxJy7DQ==.lJqAvj2+ojmTNw==	B_Positive	V4XvRE0tDSGF0J9d.oURQ+ysqWzW6pYvoUuavhA==.R22cjtrerRg8HmgyiOEbMBSF8msFh2we+Uaf97O5KraZVtu2YqqcFbles48zyzBQ87zyQlvtkYI2OEIAw1GaLCzPkTrr+9UL4SuQt5s2ZFznZA==	44qjw15Q1E2XvUqF.g/zkujLQpd2RIlF0DYDX0A==.TrOXgZht5eNOtg==	Jn2qXOwdQ/7HEsNJ.OP/8MzrePPVhZ7rLf9WDcg==.eOYD0KJ9JvtYklha2yAc8RBedhmFMcNkKRFvI7WWm2TYbMOBqyVmzpYXogJ+qLi6ClPzaoHn+sRbMbGUrCQNfnZ1nnHmm66htOXHZ8hEHa+GGTPinA3D+WpjUCYEdH2YdS0=	XsC9bcj4rmqYxSZI.PBSR6NBjOMHLElIybiYdDA==.t44Dw2CPq61LyzpMLr6oU7tf2sIubwT49gd4UYavVQbCdZ1rzCahqBICUlNOHyFvNVzTcdTZFlrwwvMHY0bfYNQgUADz9Q==	YPxH0UNSFta+vKHv.7XyoQqvuvdb1GC+WmxnBSQ==.XEP6wInj6a7aPW+rKogb8ZM=	Married	Lakshmi	Retired schoolteacher	0dcXdx2bMcuZ/NKP.254BmfBeWDYlOuOiElYfug==.k5Y2aVj6fsM=	Light	mQc/Lwl+/Q/b8MfT.2xkC8SSbf0dgYNJ4TbD88g==.nIpOUwVWutYRL1g0CPn77GNajHHnv2yvCm0ryREydN15XsXz1dH10uIFkA==	\N	Never	Never	V0dEySKKgR5XeVSW.K9FxdzufsrCyYjOEFDC8/Q==.aOZ48lZoe7D3	elZXjtffPlqmFj++.90pct4qy/tST8nMr5MxcXw==./a4pVg==	c83d2bdc82bfe98a57ecab921a5e47d09efdc0f9a7ec0d78bcc174800568d691	{"appearance": {"theme": "light"}, "accessibility": {"largeText": false, "highContrast": false, "reduceMotion": false, "screenReader": false}}	SHRI-ER1RV4-Z	9a4f7960c1ac8b2d42a013ec34b682dbccedd59dc9e154adc4f4a0cf99613172	f	SelfRegistered	\N	Unverified	t
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, resource, action, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profile_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile_photos (id, patient_profile_id, filename, path, mime_type, uploaded_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, family_id, revoked_at, replaced_by, expires_at, device_label, ip_address, user_agent, created_at) FROM stdin;
a8f045d5-e973-407f-ac02-637955afad09	f863144b-4b2a-4174-bb49-8fdf784cf731	8c5b274564c3d80a1241166dfc3bd63f129a777fb0d19e9917b5b0533034cfcb	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-09 10:30:58.015	56d31d0f2d36b9788a41dcb62fb0abfe66400b5082c4b41eead792fa9d841983	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	2026-09-09 10:17:12.487
d646afed-e2c1-4ded-a3b1-197d0d3f502d	f863144b-4b2a-4174-bb49-8fdf784cf731	56d31d0f2d36b9788a41dcb62fb0abfe66400b5082c4b41eead792fa9d841983	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-09 10:46:40.399	a64c047ce0c8a8a6308ae0f25f3c56097d10d38c7b2d4c8d9509a7f278f2f171	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 10:30:58.019
4f2b6ce3-277c-42a8-b25f-b173e102fa5c	f863144b-4b2a-4174-bb49-8fdf784cf731	a64c047ce0c8a8a6308ae0f25f3c56097d10d38c7b2d4c8d9509a7f278f2f171	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-09 11:01:52.393	f0a32348afc6957409692ceb11207bcb7149eabe2ad7f011331ea90302ddab4c	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 10:46:40.401
b1654946-8067-4d89-860d-1f7566a5b4ef	8250825b-8ed2-4879-bc56-25d409f3cbe8	48e19f891324f7e344decd6003cde1310293978d4deb9f5b53aead1dd030e838	9f514b63-3259-4552-a6c2-ce00c852fe55	2026-09-09 09:59:56.365	\N	2026-10-09 09:54:06.777	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 09:54:06.779
c2654192-b048-456b-95f5-1bcce90539c3	8250825b-8ed2-4879-bc56-25d409f3cbe8	fbb58b63d2c4bee6c883b60e8d8d35dd31001856849041d869962db51199f87c	5fe75f63-8c40-4a8c-b8b5-c56bfd6cfc3e	2026-09-09 10:10:41.232	062bdfd089743e8991342fea8284ae7eec79efaa5b3baed265f666f539e00237	2026-10-09 10:00:11.838	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 10:00:11.839
f21e0dcd-c66d-48ed-b5c7-e626b499f8ed	8250825b-8ed2-4879-bc56-25d409f3cbe8	062bdfd089743e8991342fea8284ae7eec79efaa5b3baed265f666f539e00237	5fe75f63-8c40-4a8c-b8b5-c56bfd6cfc3e	2026-09-09 10:16:54.28	\N	2026-10-09 10:00:11.838	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 10:10:41.235
1f09df96-c3f6-4238-8d95-247b132b1521	f863144b-4b2a-4174-bb49-8fdf784cf731	f0a32348afc6957409692ceb11207bcb7149eabe2ad7f011331ea90302ddab4c	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-09 11:16:52.389	a1703bad73109476d1efcfe36f7314bcb449a2eeafec91bfb9bc6fbc0ad1741a	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 11:01:52.395
8c4dcce1-48ad-4b37-a48b-cfa2137e247b	f863144b-4b2a-4174-bb49-8fdf784cf731	a1703bad73109476d1efcfe36f7314bcb449a2eeafec91bfb9bc6fbc0ad1741a	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-09 11:31:52.417	a4c6e3a022944509ae223112f916899353374260b4226202ad66a403b4574dd1	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 11:16:52.39
b92cabca-4761-4cb8-9f4a-2b7fddf8ae65	f863144b-4b2a-4174-bb49-8fdf784cf731	a4c6e3a022944509ae223112f916899353374260b4226202ad66a403b4574dd1	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-09 11:46:52.397	f87700388d6e7dcd33e51c14276bc543ffe1eb48eebe484ad25332887ccb0108	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 11:31:52.419
2be2b82c-61d2-44eb-8773-4e8c7acb0201	f863144b-4b2a-4174-bb49-8fdf784cf731	f87700388d6e7dcd33e51c14276bc543ffe1eb48eebe484ad25332887ccb0108	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-10 08:42:02.004	430b50cdd8561bdf27bdb7b221a060640530a65683f05bd3e7a582e6c2740700	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-09 11:46:52.399
d22e7ed8-0bd2-4d35-8ac4-6725699a4753	f863144b-4b2a-4174-bb49-8fdf784cf731	430b50cdd8561bdf27bdb7b221a060640530a65683f05bd3e7a582e6c2740700	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-10 08:42:02.043	322c87a5483714d0cbb34137de2a78f2ff9c9d8df4f3f1ecf1c89af390a2ca60	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 08:42:02.005
0775df73-1d93-4b73-a00a-5fd3f640a883	f863144b-4b2a-4174-bb49-8fdf784cf731	322c87a5483714d0cbb34137de2a78f2ff9c9d8df4f3f1ecf1c89af390a2ca60	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-10 08:43:23.256	49ba848c717b3d17b64123ad61bccc9063a439deb89d15f126ec950a25ad219d	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 08:42:02.044
ca90bb7a-295b-482f-bd24-9ca36e019983	f863144b-4b2a-4174-bb49-8fdf784cf731	49ba848c717b3d17b64123ad61bccc9063a439deb89d15f126ec950a25ad219d	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-10 08:43:23.281	dadff6a1cb77eec8fa1acc8d9074f9035588c14234c590ee2e32bf413bcd8c18	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 08:43:23.257
6befb033-c7c2-4ce1-ba4e-40d781360671	839f3441-a924-45aa-b78c-19f64b24ef1b	10a555855d100300bb7db44edc7e3c5d0fe85b0e93101dba5e8ef0f8d7630ee3	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:53:59.66	79d1252518e8f6aadba3587c1de6772a1584a24eb568ab9b6833002be30dfed5	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:53:58.02
bfc81d59-c2ab-48bb-a076-18e7f352c2bb	839f3441-a924-45aa-b78c-19f64b24ef1b	79d1252518e8f6aadba3587c1de6772a1584a24eb568ab9b6833002be30dfed5	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:54:20.941	142efa1c85e84de4072c09746af6cfc31636b19bfbb9115dce4825c431b32558	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:53:59.662
e7710464-a08f-4a42-af62-4f57bc85818d	839f3441-a924-45aa-b78c-19f64b24ef1b	1fe7383623ad8cc9bf5b5bf87d2b2ff99c2089f04d1b4884e705d3b843f062bd	811bd745-3edf-4d58-9dbc-69334ca3e12a	2026-09-10 08:54:57.627	683e2b1df4c950b53bf2bb7f364067749b40db6eaf0b176d130affd7e8b474f5	2026-10-10 08:54:57.557	\N	::1	curl/8.5.0	2026-09-10 08:54:57.558
b83eb6c8-e8c3-4c0f-90a8-17030e840558	839f3441-a924-45aa-b78c-19f64b24ef1b	c74d805269b204a9a518170861caaa8abe986320ac8fad186014505435a277e3	60b7be17-d650-4cfb-b19a-36f8f9977930	\N	\N	2026-10-10 08:47:38.34	\N	::1	curl/8.5.0	2026-09-10 08:47:38.342
41dced7b-f1d0-491b-8789-74f6fc49a006	839f3441-a924-45aa-b78c-19f64b24ef1b	63619d0fc637c1fb8a82d3342987494655c92a4ddeecd713f9ae36671a66982c	9e2b13ed-094f-4439-9857-436482b0f069	2026-09-10 08:51:11.505	3d34d43189efe464b3654cb8ea93a5b1dfbdd2b3f91b540f738955d04af735f8	2026-10-10 08:51:11.404	\N	::1	curl/8.5.0	2026-09-10 08:51:11.405
a7719c1b-99c6-4455-aaad-7e72070d5ba2	839f3441-a924-45aa-b78c-19f64b24ef1b	3d34d43189efe464b3654cb8ea93a5b1dfbdd2b3f91b540f738955d04af735f8	9e2b13ed-094f-4439-9857-436482b0f069	\N	\N	2026-10-10 08:51:11.404	\N	::1	curl/8.5.0	2026-09-10 08:51:11.51
8e85642a-a736-49e9-b88a-10ae77ef7f50	839f3441-a924-45aa-b78c-19f64b24ef1b	1e9f13cfc2017450b719ebed2ad2922b093d59b2fa04fa97846a7160aeb95761	fff18331-91cd-43e0-b9e4-c0b59d1f62c7	2026-09-10 08:51:12.002	7fdd412de2abf84d3880a8649ed4f204c17b25292f78e620bf1af8eaad23a32f	2026-10-10 08:51:11.953	\N	::1	curl/8.5.0	2026-09-10 08:51:11.954
fa8b5031-97bb-48d3-889d-7d91b5a757a2	839f3441-a924-45aa-b78c-19f64b24ef1b	7fdd412de2abf84d3880a8649ed4f204c17b25292f78e620bf1af8eaad23a32f	fff18331-91cd-43e0-b9e4-c0b59d1f62c7	2026-09-10 08:51:12.049	\N	2026-10-10 08:51:11.953	\N	::1	curl/8.5.0	2026-09-10 08:51:12.004
39200d26-2469-4b1c-a59c-1cb8b9f8968e	839f3441-a924-45aa-b78c-19f64b24ef1b	f7c29c6b21bc066efa75da5c75365d1afb44e7700afe6097b6e053eec583814b	f980b219-fe00-469e-8274-17516d8250ee	\N	\N	2026-10-10 08:53:36.889	\N	::1	curl/8.5.0	2026-09-10 08:53:36.891
c1d37c75-5791-4763-80a7-787f2f877dc4	839f3441-a924-45aa-b78c-19f64b24ef1b	683e2b1df4c950b53bf2bb7f364067749b40db6eaf0b176d130affd7e8b474f5	811bd745-3edf-4d58-9dbc-69334ca3e12a	\N	\N	2026-10-10 08:54:57.557	\N	::1	curl/8.5.0	2026-09-10 08:54:57.63
6519b5bc-508a-47a4-a63a-37f211b6babf	839f3441-a924-45aa-b78c-19f64b24ef1b	de947629bd5caad5f0d7226422a1fb761e1979f7cd2d75a5df686807cc9a4093	0de7bbf8-d763-4f9f-bff5-c700764b4a5a	2026-09-10 08:55:19.018	\N	2026-10-10 08:55:18.985	\N	::1	curl/8.5.0	2026-09-10 08:55:18.986
96cee333-77ae-4f8a-8769-a33753c1bcb1	839f3441-a924-45aa-b78c-19f64b24ef1b	142efa1c85e84de4072c09746af6cfc31636b19bfbb9115dce4825c431b32558	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:55:32.762	63e147b92ed6961c6df1541f329e81eba5598de8c33113d7cf32b436b23b6930	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:54:20.942
fbf301d8-d146-4f44-8a57-f973a0a07651	839f3441-a924-45aa-b78c-19f64b24ef1b	63e147b92ed6961c6df1541f329e81eba5598de8c33113d7cf32b436b23b6930	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:55:34.166	0c510ede68b577bf01a5e4734ec4c4dd8e9d6de02ce1b7ab34bef83a0e709fe2	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:55:32.764
f0122daa-eb64-4893-9a1b-d8b92c1ed871	839f3441-a924-45aa-b78c-19f64b24ef1b	0c510ede68b577bf01a5e4734ec4c4dd8e9d6de02ce1b7ab34bef83a0e709fe2	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:55:35.658	53f59646dcf18af1e203681bee2d5e299cafe00089b7d3faf6efcd6a90fd5265	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:55:34.168
cefddbee-20a4-4bb4-9b5a-90f04628e0aa	839f3441-a924-45aa-b78c-19f64b24ef1b	53f59646dcf18af1e203681bee2d5e299cafe00089b7d3faf6efcd6a90fd5265	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:56:05.111	a3016c56e65574f8b7bc8b77859512dc51f2eed0695ff8254fcf12ee951421c4	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:55:35.659
99166f1b-d6f3-404d-a8aa-f0b2c623211e	839f3441-a924-45aa-b78c-19f64b24ef1b	a3016c56e65574f8b7bc8b77859512dc51f2eed0695ff8254fcf12ee951421c4	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:57:57.481	53060d30b62cf9ad91967145d0bb5fe5cb3973bf167b97015de1729d99f1e09b	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:56:05.113
864aae81-bdd8-47e2-b0f6-54b7f222bc52	f863144b-4b2a-4174-bb49-8fdf784cf731	dadff6a1cb77eec8fa1acc8d9074f9035588c14234c590ee2e32bf413bcd8c18	42f159ab-ede1-4b2d-b15a-ed156f51845a	2026-09-10 08:58:12.602	\N	2026-10-09 10:17:12.485	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 08:43:23.283
26eb2087-47e9-4407-8fec-47fb01d876d1	839f3441-a924-45aa-b78c-19f64b24ef1b	53060d30b62cf9ad91967145d0bb5fe5cb3973bf167b97015de1729d99f1e09b	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 08:58:59.572	f3f91f304bc40c0d737f3dc725eb9d1a98da474efdbcbd8953e837702f50c590	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:57:57.484
cd3242f0-721e-41cb-8c1c-66d166d005b9	f863144b-4b2a-4174-bb49-8fdf784cf731	0b4a5661415143c6fbce4a6c9f194af4fd20b13ee56cb3d01519361fb375e5e8	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 09:01:04.826	5f375892b09ba1e71e5238e4a41d6bd5d080b69464444b7918b11a0f0de29726	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 08:58:39.82
acd237bd-51d1-41f0-8266-107566f67895	839f3441-a924-45aa-b78c-19f64b24ef1b	f3f91f304bc40c0d737f3dc725eb9d1a98da474efdbcbd8953e837702f50c590	2cc41b41-e07c-432a-93f9-f5cf58d15796	2026-09-10 09:01:18.387	fb0c317c9dbcd9f88dd5c4406a0284c85027aa88b85dee5ea74e5714a88fce14	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 08:58:59.573
8274224b-b773-4ba9-83a5-2c0656d9b881	839f3441-a924-45aa-b78c-19f64b24ef1b	fb0c317c9dbcd9f88dd5c4406a0284c85027aa88b85dee5ea74e5714a88fce14	2cc41b41-e07c-432a-93f9-f5cf58d15796	\N	\N	2026-10-10 08:53:58.019	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 09:01:18.389
5951cf28-3e1a-4a26-aeaf-bb8500d53533	839f3441-a924-45aa-b78c-19f64b24ef1b	e8afecf458291cbb4821d662542930e96a872aa74feda9ccb560b6887e516d7a	77251bb7-907f-4755-92f7-6b8ae3952998	2026-09-10 09:05:02.504	\N	2026-10-10 09:05:02.413	\N	::1	curl/8.5.0	2026-09-10 09:05:02.414
97510b7a-0440-431d-8d8b-4930925dbf49	f863144b-4b2a-4174-bb49-8fdf784cf731	5f375892b09ba1e71e5238e4a41d6bd5d080b69464444b7918b11a0f0de29726	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 09:13:49.799	c8c7bb628501d81181417551cc2d12b5b15aba5caf082908d3ddcdd44952d6ee	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 09:01:04.829
028a8780-9751-4c34-a5d9-fb35a01bf906	f863144b-4b2a-4174-bb49-8fdf784cf731	c8c7bb628501d81181417551cc2d12b5b15aba5caf082908d3ddcdd44952d6ee	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 09:16:49.793	a5ac931f51c6996285f4fed8184acd3f411943f734e9220293a20665ac280a4d	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 09:13:49.801
eb66adee-e692-45d7-b998-a742962b896d	839f3441-a924-45aa-b78c-19f64b24ef1b	c7a096f5194aa66238e555393839cd2dbff9c9750f666c52a5b8e8c5f7bf72a2	3802cf98-e660-497c-aa99-94c93bdd06fb	2026-09-10 11:34:12.661	5a9b8a7dd2ddeda7c24547e8d0284ea7cb8426f9df714c74b9573c0ce3c3c948	2026-10-10 11:34:12.565	\N	::1	curl/8.5.0	2026-09-10 11:34:12.567
44e89985-dccd-4fdf-bc31-b816892745a7	f863144b-4b2a-4174-bb49-8fdf784cf731	a5ac931f51c6996285f4fed8184acd3f411943f734e9220293a20665ac280a4d	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 09:31:49.789	7f078d065231cf4b4a72c1a6b28ec77612d9881acbe844b9cd9511f12288ee06	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 09:16:49.794
3ef1f202-e7ca-45b0-8953-5c76f4437cc6	f863144b-4b2a-4174-bb49-8fdf784cf731	7f078d065231cf4b4a72c1a6b28ec77612d9881acbe844b9cd9511f12288ee06	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 09:46:49.804	1e25d1287060c4f77e2348e374b532f35c9439c49d6cdd9b711a83c1527a83d0	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 09:31:49.79
293955df-3f63-44de-a60f-fb218a1b987e	f863144b-4b2a-4174-bb49-8fdf784cf731	1e25d1287060c4f77e2348e374b532f35c9439c49d6cdd9b711a83c1527a83d0	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 10:01:49.788	7203bde42be5889a7d45bb70e3fc55c4acb334d6feb7b6933dc2100040aefd1f	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 09:46:49.805
abc3a752-3392-47df-85d0-2df0a06305bf	f863144b-4b2a-4174-bb49-8fdf784cf731	7203bde42be5889a7d45bb70e3fc55c4acb334d6feb7b6933dc2100040aefd1f	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 10:16:20.373	4874b776660d01f28d3654e597ee3e673fc4f5e50bed3b6259dcc30e2308afae	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 10:01:49.789
ca6d4c1f-36c2-49f8-8c0f-07548cbe3bb0	f863144b-4b2a-4174-bb49-8fdf784cf731	4874b776660d01f28d3654e597ee3e673fc4f5e50bed3b6259dcc30e2308afae	8c0011e1-8405-4195-a72d-4965d80a8d25	2026-09-10 10:16:30.823	\N	2026-10-10 08:58:39.819	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 10:16:20.374
b1f97cc8-272b-4f1a-bd55-61a5270fb33b	839f3441-a924-45aa-b78c-19f64b24ef1b	c656cc70e65f26a7c1373969c957b93ff067c6671ad9c5c8f1fe461ac54d4ebf	7f6769cd-a1a7-4e6d-8d6e-5bca7950ef1c	2026-09-10 10:31:49.805	69d09741e80a9407a6c064605eadaffe562853baedb7b1d11e7160df41a654b7	2026-10-10 10:16:43.903	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 10:16:43.904
49505c10-e898-400b-8e7c-ed7bb1a27031	839f3441-a924-45aa-b78c-19f64b24ef1b	69d09741e80a9407a6c064605eadaffe562853baedb7b1d11e7160df41a654b7	7f6769cd-a1a7-4e6d-8d6e-5bca7950ef1c	2026-09-10 10:47:28.796	c315f837303a58f46325b736fdcd6d1202e03447d528af212a6dc5e4a9c4f6d4	2026-10-10 10:16:43.903	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 10:31:49.807
d4eec92b-f03c-4c13-877e-9484b927111c	839f3441-a924-45aa-b78c-19f64b24ef1b	c315f837303a58f46325b736fdcd6d1202e03447d528af212a6dc5e4a9c4f6d4	7f6769cd-a1a7-4e6d-8d6e-5bca7950ef1c	2026-09-10 11:02:43.796	800af4730e501db7d7bdcc111a976cb32e56e8a77c79e70016f0f636455481b1	2026-10-10 10:16:43.903	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 10:47:28.798
48cd445c-5931-406c-a5d8-f48a9f16ee0d	839f3441-a924-45aa-b78c-19f64b24ef1b	800af4730e501db7d7bdcc111a976cb32e56e8a77c79e70016f0f636455481b1	7f6769cd-a1a7-4e6d-8d6e-5bca7950ef1c	2026-09-10 11:16:21.829	0d6a54bc96818ebc69459e7b8061d97746b8d7569dfdfaabed36162cab5da7a9	2026-10-10 10:16:43.903	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 11:02:43.798
4f7e8112-d600-4cd3-be6b-a956a1adffce	839f3441-a924-45aa-b78c-19f64b24ef1b	7f3c55aa5f1db66df6bb17d46f4cbd53891a807229c08422159ed9d55e3094e3	aaaf23c2-5ab6-4bb3-880b-5ada7d3b60ee	2026-09-10 11:22:28.495	41eeb24bc4f642d48ddb3840d9228c4cb0a971637b2f96cbeb06b0d9bec06ae1	2026-10-10 11:22:28.347	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:22:28.348
a35f51e1-3d5f-4f92-a1b2-2e5b7841a394	839f3441-a924-45aa-b78c-19f64b24ef1b	41eeb24bc4f642d48ddb3840d9228c4cb0a971637b2f96cbeb06b0d9bec06ae1	aaaf23c2-5ab6-4bb3-880b-5ada7d3b60ee	2026-09-10 11:22:59.278	93708c43adb9e3aa491c5690770767489f920b8948e03586ad78f09a2e3dc30a	2026-10-10 11:22:28.347	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:22:28.498
24dc455b-7b9e-4f03-9d13-04dff845e058	839f3441-a924-45aa-b78c-19f64b24ef1b	93708c43adb9e3aa491c5690770767489f920b8948e03586ad78f09a2e3dc30a	aaaf23c2-5ab6-4bb3-880b-5ada7d3b60ee	2026-09-10 11:23:16.431	1c03515174511349eabeade486a4ef796caf536af42f1e3b1ad11d4874b3d0ff	2026-10-10 11:22:28.347	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:22:59.28
37c520a5-131b-4362-b5cf-d0ed7f2e002d	839f3441-a924-45aa-b78c-19f64b24ef1b	1c03515174511349eabeade486a4ef796caf536af42f1e3b1ad11d4874b3d0ff	aaaf23c2-5ab6-4bb3-880b-5ada7d3b60ee	\N	\N	2026-10-10 11:22:28.347	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:23:16.432
e9baebe2-9f7c-4a6f-8f3e-3ab0396cc626	839f3441-a924-45aa-b78c-19f64b24ef1b	e11635eab5d1798fb7f9fc203a8eced58c5635037abdd54ecf7aeb4b21dddb66	1a49e805-b1ec-420a-ad6d-83443863d97b	2026-09-10 11:23:19.6	6d92138e9a0b1bd8e168edc487cf6283ce5ce5379b33e9a5556804f58b061c6d	2026-10-10 11:23:19.446	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:23:19.447
505ca3f6-4655-4338-b99e-a7582939ac77	839f3441-a924-45aa-b78c-19f64b24ef1b	6d92138e9a0b1bd8e168edc487cf6283ce5ce5379b33e9a5556804f58b061c6d	1a49e805-b1ec-420a-ad6d-83443863d97b	2026-09-10 11:24:02.634	2cc019de7911ab16818b7dece1a717b550fdb6555c29657bc6286cb079a8b6ea	2026-10-10 11:23:19.446	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:23:19.602
ac18d6f6-2e73-4d7a-aae1-cf2064f4d4ae	839f3441-a924-45aa-b78c-19f64b24ef1b	2cc019de7911ab16818b7dece1a717b550fdb6555c29657bc6286cb079a8b6ea	1a49e805-b1ec-420a-ad6d-83443863d97b	\N	\N	2026-10-10 11:23:19.446	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:24:02.635
4ac5eb14-ba65-4957-9398-36cb17da3d8d	839f3441-a924-45aa-b78c-19f64b24ef1b	1ef525e21c4e918e6484cfd61788bf482f370561f6a6c7fb8d4934c873657ae8	2f632750-ed6f-485b-b850-241ddde32a75	2026-09-10 11:24:03.787	1b70cc56f1028ea73b8262f0de1af8a681810ec44e43e6f158e1eec5ee36095a	2026-10-10 11:24:03.622	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:24:03.623
cb5a7244-902b-4819-a087-ea510fef691a	839f3441-a924-45aa-b78c-19f64b24ef1b	1b70cc56f1028ea73b8262f0de1af8a681810ec44e43e6f158e1eec5ee36095a	2f632750-ed6f-485b-b850-241ddde32a75	2026-09-10 11:24:36.208	e7d2c7f3f3265978a2baa2b27b7901f02e725168bb7c678e6cb44bff6254cca1	2026-10-10 11:24:03.622	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:24:03.789
d204b590-d434-43b4-945b-6b4d5b119900	839f3441-a924-45aa-b78c-19f64b24ef1b	e7d2c7f3f3265978a2baa2b27b7901f02e725168bb7c678e6cb44bff6254cca1	2f632750-ed6f-485b-b850-241ddde32a75	\N	\N	2026-10-10 11:24:03.622	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:24:36.21
dff16b7a-7bf7-4756-ad35-d924f7fac6ab	839f3441-a924-45aa-b78c-19f64b24ef1b	f28da590e0b9ca79a1e4e333769278d336576315f576ba56e82e6c5d019accf0	caa937fe-1c25-468a-b70c-9f9d92908c2e	2026-09-10 11:24:39.892	46eab03e40bfefb8b1332801c4d9148a6473aa0d602ccd8af5e4433fedab89ae	2026-10-10 11:24:39.738	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:24:39.739
6aa3565e-d543-4556-ad0e-3da8d5dd006f	839f3441-a924-45aa-b78c-19f64b24ef1b	46eab03e40bfefb8b1332801c4d9148a6473aa0d602ccd8af5e4433fedab89ae	caa937fe-1c25-468a-b70c-9f9d92908c2e	2026-09-10 11:25:36.846	4404ec6602efc2c8a2f035caed6985e2f92285ca8a2cd295887b1ea1da49f54a	2026-10-10 11:24:39.738	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:24:39.894
34e8fb9a-6fc4-4e9a-8198-1296d1954a98	839f3441-a924-45aa-b78c-19f64b24ef1b	0d6a54bc96818ebc69459e7b8061d97746b8d7569dfdfaabed36162cab5da7a9	7f6769cd-a1a7-4e6d-8d6e-5bca7950ef1c	2026-09-10 11:27:12.783	\N	2026-10-10 10:16:43.903	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-10 11:16:21.832
fb9f160d-d27f-49d3-877f-e3ae1fa4e771	839f3441-a924-45aa-b78c-19f64b24ef1b	4404ec6602efc2c8a2f035caed6985e2f92285ca8a2cd295887b1ea1da49f54a	caa937fe-1c25-468a-b70c-9f9d92908c2e	\N	\N	2026-10-10 11:24:39.738	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:25:36.848
e8f41bd2-077f-4664-badd-c0696303c65c	839f3441-a924-45aa-b78c-19f64b24ef1b	39f4183bdd76ee33d1a3b7541cc341a09b6032719ad050d889ab471eeba166ed	b7b2dea0-d308-42dd-983f-ecb0a3c3e706	\N	\N	2026-10-10 11:25:40.828	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:26:24.712
76744ffe-ce2b-4c9e-b58b-d81a95cd5234	839f3441-a924-45aa-b78c-19f64b24ef1b	827338f7a4c70a40dcd8b3a252928b6a41b4c1fac1c633bb3be32847614b5215	28b4131d-7685-483e-9e42-a171290ba7f2	2026-09-10 11:26:27.871	e1a1b8432933949008c6ea9c6de43c7ab50dd78140d7908998fa6fcbef2559eb	2026-10-10 11:26:27.705	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:26:27.706
94979085-50a5-494f-887a-7a38ed956284	839f3441-a924-45aa-b78c-19f64b24ef1b	e1a1b8432933949008c6ea9c6de43c7ab50dd78140d7908998fa6fcbef2559eb	28b4131d-7685-483e-9e42-a171290ba7f2	2026-09-10 11:27:26.045	25422c0cc5be14117b908b9581cc3df41876249d458de88ff04fbc0dff50c0a5	2026-10-10 11:26:27.705	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:26:27.872
2c19fee9-d21b-4070-9f23-b9cdba6a5ffa	839f3441-a924-45aa-b78c-19f64b24ef1b	25422c0cc5be14117b908b9581cc3df41876249d458de88ff04fbc0dff50c0a5	28b4131d-7685-483e-9e42-a171290ba7f2	\N	\N	2026-10-10 11:26:27.705	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:27:26.047
fad5e1cb-73ca-472f-adb1-550d14129d1e	839f3441-a924-45aa-b78c-19f64b24ef1b	dfecc25435c3aa71dfff0316eae2c7fabeb4c240a1b0723fd97720d37a15e7af	b7b2dea0-d308-42dd-983f-ecb0a3c3e706	2026-09-10 11:25:41.005	f9a158dc5d5255bc7aa3c03869371b5899a9e5a8a29bd9e4fb7450932c716b2c	2026-10-10 11:25:40.828	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:25:40.829
1c8b5647-0947-49a3-9162-9c63a45194fc	839f3441-a924-45aa-b78c-19f64b24ef1b	f9a158dc5d5255bc7aa3c03869371b5899a9e5a8a29bd9e4fb7450932c716b2c	b7b2dea0-d308-42dd-983f-ecb0a3c3e706	2026-09-10 11:26:20.619	8d51082cd47c582273c6a2d971a30a650c5e7dfd668c19f1f72cb34db3b1619b	2026-10-10 11:25:40.828	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:25:41.006
2d384daf-67a4-4bac-acb1-a7d11df68f14	839f3441-a924-45aa-b78c-19f64b24ef1b	8d51082cd47c582273c6a2d971a30a650c5e7dfd668c19f1f72cb34db3b1619b	b7b2dea0-d308-42dd-983f-ecb0a3c3e706	2026-09-10 11:26:24.711	39f4183bdd76ee33d1a3b7541cc341a09b6032719ad050d889ab471eeba166ed	2026-10-10 11:25:40.828	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:26:20.62
bb97dedb-227e-477b-a0fa-7f1cef4d3c5f	839f3441-a924-45aa-b78c-19f64b24ef1b	a329c13f60ffb2f17029c4f24c8b22843573e69f8164d9efb91246fb7e42bd17	eb21da8e-8316-4e6b-ab76-689816e1c315	\N	\N	2026-10-10 11:29:12.392	\N	::1	curl/8.5.0	2026-09-10 11:29:12.394
0a5f223c-4d5c-45b5-bd21-2575892261d8	839f3441-a924-45aa-b78c-19f64b24ef1b	6b004a4866ecdf4f6c6d9f27c9f3c4e1b84cd5cc516ef4d2ac741eaae887e1ea	acaecfbd-7fec-4b61-90ee-eadd2f90e2c0	2026-09-10 11:29:19.921	30da61dc1b039728e8320e576df548cf449ed75f8379d23b9518c80dade906f9	2026-10-10 11:27:29.554	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:27:29.555
2b58c630-e4a0-46e3-84ca-30fa8f787601	839f3441-a924-45aa-b78c-19f64b24ef1b	30da61dc1b039728e8320e576df548cf449ed75f8379d23b9518c80dade906f9	acaecfbd-7fec-4b61-90ee-eadd2f90e2c0	\N	\N	2026-10-10 11:27:29.554	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:29:19.925
cd436b8e-d60e-44c6-a9e7-6072a530e16d	839f3441-a924-45aa-b78c-19f64b24ef1b	f0cf2588838adfbf00694e8f2deddb24cf9f29368d006d1ae369abef17209c1a	ffb6ae4c-397e-428a-bfef-9eb947a9799b	2026-09-10 11:29:21.562	aea2ed5df9eb6319e5b28f54a777403d29ca5cafedc32624d08851ef5844c575	2026-10-10 11:29:21.415	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:29:21.416
cbc95b4d-204f-47df-b447-2053bba419ba	839f3441-a924-45aa-b78c-19f64b24ef1b	aea2ed5df9eb6319e5b28f54a777403d29ca5cafedc32624d08851ef5844c575	ffb6ae4c-397e-428a-bfef-9eb947a9799b	2026-09-10 11:30:27.663	ba68ddb99cda422e1e86a1f3f4b543c029d7eec6f5682aa35ede635e571f80f8	2026-10-10 11:29:21.415	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:29:21.564
7cbfa286-b09a-436d-9e44-57cd1d24bd91	839f3441-a924-45aa-b78c-19f64b24ef1b	ba68ddb99cda422e1e86a1f3f4b543c029d7eec6f5682aa35ede635e571f80f8	ffb6ae4c-397e-428a-bfef-9eb947a9799b	\N	\N	2026-10-10 11:29:21.415	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:30:27.664
3482ecc6-cc12-4cfd-8c9b-1681ac17f004	839f3441-a924-45aa-b78c-19f64b24ef1b	09014568ea36ae9917e099539fa0b8139ccb3fac569d6d5e827056eb13e6b019	9a488453-9d48-41e7-9b4e-37a57297244e	2026-09-10 11:30:29.333	ae18fc7e0657e6400182f2d75528db2de8bebb358674adba85d7081122cd6057	2026-10-10 11:30:29.14	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:30:29.142
74b1b06a-5ec9-40e1-95f2-258bd2491d42	839f3441-a924-45aa-b78c-19f64b24ef1b	ae18fc7e0657e6400182f2d75528db2de8bebb358674adba85d7081122cd6057	9a488453-9d48-41e7-9b4e-37a57297244e	2026-09-10 11:31:33.813	ffd475ebe8ad4205a1f9f92d11e47cc256dc8d162ebe17a2120bdfda3b514d92	2026-10-10 11:30:29.14	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:30:29.334
e226f51c-7b57-4ae3-838a-8f1dc392d972	839f3441-a924-45aa-b78c-19f64b24ef1b	ffd475ebe8ad4205a1f9f92d11e47cc256dc8d162ebe17a2120bdfda3b514d92	9a488453-9d48-41e7-9b4e-37a57297244e	\N	\N	2026-10-10 11:30:29.14	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:31:33.815
eff9587b-3fa3-4ddd-8b4d-f6965afe450d	839f3441-a924-45aa-b78c-19f64b24ef1b	debce3ab04ea1b3a125b59b22d73a69e2b6d656a0a5dcf400434759511a145ed	19e5c3b5-1908-4349-8e11-c167aa289a5b	2026-09-10 11:31:36.006	18bc8ef67123a312e0bbe093358c9db2f2a07e575c2226561b50144e18fc619c	2026-10-10 11:31:35.837	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:31:35.838
8b7eeb05-b246-4c17-a1d3-64431d1ee391	839f3441-a924-45aa-b78c-19f64b24ef1b	18bc8ef67123a312e0bbe093358c9db2f2a07e575c2226561b50144e18fc619c	19e5c3b5-1908-4349-8e11-c167aa289a5b	2026-09-10 11:31:48.395	\N	2026-10-10 11:31:35.837	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:31:36.008
9e3b41a5-6e80-4749-b85a-84130f3d92b6	839f3441-a924-45aa-b78c-19f64b24ef1b	a5da96afcfa382099e37ce1bd62c437f732ed397af2f9ffe91dbcc771be57ef8	6a939cd4-5f55-41d7-b792-dc9bf76b56ef	2026-09-10 11:31:51.996	d3fa708e8063e48db0eee45f6e32c28ae6c1ebc97d756d48b44f826d4260d8a6	2026-10-10 11:31:51.792	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:31:51.793
99d15eed-8a10-40a6-9271-b2a26809d4d2	839f3441-a924-45aa-b78c-19f64b24ef1b	d3fa708e8063e48db0eee45f6e32c28ae6c1ebc97d756d48b44f826d4260d8a6	6a939cd4-5f55-41d7-b792-dc9bf76b56ef	2026-09-10 11:32:34.52	c98e5697a65cc213734b2d35618cd4944e64f5acb5befe462d82ce3dcedd531d	2026-10-10 11:31:51.792	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:31:51.998
df3e055d-dbcd-4e4f-9c84-663095268881	839f3441-a924-45aa-b78c-19f64b24ef1b	c98e5697a65cc213734b2d35618cd4944e64f5acb5befe462d82ce3dcedd531d	6a939cd4-5f55-41d7-b792-dc9bf76b56ef	\N	\N	2026-10-10 11:31:51.792	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:32:34.522
01ba85f2-7181-4952-90c4-f241a1dd2a77	839f3441-a924-45aa-b78c-19f64b24ef1b	54dc70de0c28190a02182a00e32f96b09334d305299993dc713c1d79283c4ce5	ccc88ef1-30f1-4f72-a9e9-dc53dade2c88	2026-09-10 11:32:37.673	94de6fbed3a352c8a1cb14971e24da273f68faa6aa70a7e693497911780cd455	2026-10-10 11:32:37.518	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:32:37.519
0f4c1f07-339f-45e0-a26f-07d48ef270d3	839f3441-a924-45aa-b78c-19f64b24ef1b	94de6fbed3a352c8a1cb14971e24da273f68faa6aa70a7e693497911780cd455	ccc88ef1-30f1-4f72-a9e9-dc53dade2c88	2026-09-10 11:32:50.05	\N	2026-10-10 11:32:37.518	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:32:37.674
35ffcdab-3473-412c-b827-710390c1cb30	839f3441-a924-45aa-b78c-19f64b24ef1b	0211b4dc0311da8597c110a63ec31baf9466d3b17bc574200ca5c5314c2a4f02	a23b2736-02a4-4fae-8665-1c32eed7a42b	2026-09-10 11:32:54.711	984351d2a55a5d3f5c17cb28c29045676f2528cfb40c44ddb3bccff5774e8a41	2026-10-10 11:32:54.522	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:32:54.523
0abd3c6b-ac0a-4706-8c76-b181ab391a17	839f3441-a924-45aa-b78c-19f64b24ef1b	c50c489c3dc177ee98c49aea63da6cb0a1d50787c7ba5a05b36c6f222ffa3473	6e15b506-29fe-4ab6-a654-1f09968c6fbd	2026-09-10 11:33:59.327	9f5ad2c22da114bd99eed2e157864c284edda6d5a0cda7f0bf7f977ba5e205d1	2026-10-10 11:33:59.218	\N	::1	curl/8.5.0	2026-09-10 11:33:59.22
a3d141a6-adb2-46b8-b599-4061dac5ef77	839f3441-a924-45aa-b78c-19f64b24ef1b	9f5ad2c22da114bd99eed2e157864c284edda6d5a0cda7f0bf7f977ba5e205d1	6e15b506-29fe-4ab6-a654-1f09968c6fbd	2026-09-10 11:33:59.451	f97bd206d999c27eb01fc6e880e2120989c5eba9731005a1c5553d9d02a17756	2026-10-10 11:33:59.218	\N	::1	curl/8.5.0	2026-09-10 11:33:59.328
e45f992b-c4a4-4c42-b4e7-221d052141d7	839f3441-a924-45aa-b78c-19f64b24ef1b	f97bd206d999c27eb01fc6e880e2120989c5eba9731005a1c5553d9d02a17756	6e15b506-29fe-4ab6-a654-1f09968c6fbd	\N	\N	2026-10-10 11:33:59.218	\N	::1	curl/8.5.0	2026-09-10 11:33:59.453
c06ab17d-32a0-4131-901a-681cf77a38ba	839f3441-a924-45aa-b78c-19f64b24ef1b	5a9b8a7dd2ddeda7c24547e8d0284ea7cb8426f9df714c74b9573c0ce3c3c948	3802cf98-e660-497c-aa99-94c93bdd06fb	2026-09-10 11:34:12.719	\N	2026-10-10 11:34:12.565	\N	::1	curl/8.5.0	2026-09-10 11:34:12.663
a146efda-e608-4753-b5a9-15d53f9b2da4	839f3441-a924-45aa-b78c-19f64b24ef1b	663883dd6e3a796d126a1cab11ca6671a093acc5d98b105f055ec37b2760a3da	14eb6496-5386-47ea-b69f-931a9bf7131f	2026-09-10 11:34:37.5	63d715c37e91a29b292b42aa34dc807632e46d9210baf219f2ca451f90f7e352	2026-10-10 11:34:36.337	\N	::1	curl/8.5.0	2026-09-10 11:34:36.338
a98226d5-eb68-4597-8b4b-5f511321a0b6	839f3441-a924-45aa-b78c-19f64b24ef1b	63d715c37e91a29b292b42aa34dc807632e46d9210baf219f2ca451f90f7e352	14eb6496-5386-47ea-b69f-931a9bf7131f	2026-09-10 11:34:37.658	\N	2026-10-10 11:34:36.337	\N	::1	curl/8.5.0	2026-09-10 11:34:37.502
8a43d099-a745-498a-98a6-b2dbce0828eb	839f3441-a924-45aa-b78c-19f64b24ef1b	984351d2a55a5d3f5c17cb28c29045676f2528cfb40c44ddb3bccff5774e8a41	a23b2736-02a4-4fae-8665-1c32eed7a42b	2026-09-10 11:37:46.241	55fa9277af587988d85ff6a4da2b66ea5ab3fe09abc8c17a657ba234cde83c6e	2026-10-10 11:32:54.522	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:32:54.713
3f213fab-f7e3-4346-a6aa-856694536879	839f3441-a924-45aa-b78c-19f64b24ef1b	55fa9277af587988d85ff6a4da2b66ea5ab3fe09abc8c17a657ba234cde83c6e	a23b2736-02a4-4fae-8665-1c32eed7a42b	2026-09-10 11:38:03.241	1fa550dd84f2d6bc106d78ea4d281b62fdd6f2aa97f080e9f2c59cef929c49bb	2026-10-10 11:32:54.522	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:37:46.242
79e2104b-8147-409e-801a-5fe31071dc7f	839f3441-a924-45aa-b78c-19f64b24ef1b	6de88eafeef22986cf606d122524d1f77e736673fb7533d1253b5fe41f43bb3c	aa42bcfb-ffaa-466a-82ee-9f5307f96cb2	\N	\N	2026-10-10 11:39:06.679	\N	::1	curl/8.5.0	2026-09-10 11:39:06.68
656e3a30-d37d-47a7-a344-685d6a337f3a	839f3441-a924-45aa-b78c-19f64b24ef1b	1fa550dd84f2d6bc106d78ea4d281b62fdd6f2aa97f080e9f2c59cef929c49bb	a23b2736-02a4-4fae-8665-1c32eed7a42b	2026-09-10 11:39:13.561	535ba4e5062634966bd0cceff4b620de09df057473e15d18e744aab873672235	2026-10-10 11:32:54.522	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:38:03.242
db731f10-c37b-4921-b3f7-f3191fc0b142	839f3441-a924-45aa-b78c-19f64b24ef1b	535ba4e5062634966bd0cceff4b620de09df057473e15d18e744aab873672235	a23b2736-02a4-4fae-8665-1c32eed7a42b	\N	\N	2026-10-10 11:32:54.522	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:39:13.564
dc5065a4-e340-435d-9d46-9e23546aad04	839f3441-a924-45aa-b78c-19f64b24ef1b	a63c922e36c7a3c49fcb553a0107caffcec5aec495b0b8045b90a756c04e8f86	c97833c2-6402-4992-ad2e-780a489277e4	2026-09-10 11:39:15.193	c8d1d7989373cbb3ea33e295206ee13bae822e472b660cbcdf2a578529b85107	2026-10-10 11:39:15.032	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:39:15.033
9861fb48-b8de-4303-bb89-6d57d41999e1	839f3441-a924-45aa-b78c-19f64b24ef1b	c8d1d7989373cbb3ea33e295206ee13bae822e472b660cbcdf2a578529b85107	c97833c2-6402-4992-ad2e-780a489277e4	2026-09-10 11:39:46.464	0d094c8e5722af17b4d8e5673ad9c5e54896f681746a5dc30984beeba38d9870	2026-10-10 11:39:15.032	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:39:15.195
00bc7ed7-15c1-4ab8-8bcf-98558117ccbd	839f3441-a924-45aa-b78c-19f64b24ef1b	0d094c8e5722af17b4d8e5673ad9c5e54896f681746a5dc30984beeba38d9870	c97833c2-6402-4992-ad2e-780a489277e4	\N	\N	2026-10-10 11:39:15.032	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:39:46.466
93cabeba-7cfc-46bb-90a5-55cdedc3e43c	839f3441-a924-45aa-b78c-19f64b24ef1b	2e8c8ae71bc4c8d1e536f79d66c374043b9ec506be187fd1b61feed1c148cf05	2ad303aa-89d9-4ed2-a843-833eccac7fa7	2026-09-10 11:39:48.083	7be01f1edda95be5a38056cd264175c5681e06f0bc27c2bcd619ef7d79b021d8	2026-10-10 11:39:47.917	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:39:47.919
e13453cd-9d2c-4800-879c-b6ca31a73b96	839f3441-a924-45aa-b78c-19f64b24ef1b	7be01f1edda95be5a38056cd264175c5681e06f0bc27c2bcd619ef7d79b021d8	2ad303aa-89d9-4ed2-a843-833eccac7fa7	\N	\N	2026-10-10 11:39:47.917	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-10 11:39:48.085
22e6cd72-354b-4235-aa52-f1ec64ae357c	839f3441-a924-45aa-b78c-19f64b24ef1b	ce3918272883c16ed332ae5bae2e2ec7d1cd9eea42a3b90b16d404d9e88b7731	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:40.439	12c7f8201c006b6a1bfecd3f757865f55c9ed07cfcad5d210f8c57595008b0f6	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:40.009
e1f50f9e-b566-4fc8-b925-b2e7aab406bb	839f3441-a924-45aa-b78c-19f64b24ef1b	12c7f8201c006b6a1bfecd3f757865f55c9ed07cfcad5d210f8c57595008b0f6	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:42.403	38b93d661ca74d9a60d7de4db641fc5a5604d6bc443161d0b741bc1c55571298	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:40.443
ecb373cc-4dd3-4684-8e98-c0bda2960009	839f3441-a924-45aa-b78c-19f64b24ef1b	38b93d661ca74d9a60d7de4db641fc5a5604d6bc443161d0b741bc1c55571298	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:44.471	589ced18454387a57d97cd9149b7812ed65325b9ce96a4d50a892cb14d150919	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:42.405
54f2be9a-7c41-4ca8-ace9-c7f338f07297	839f3441-a924-45aa-b78c-19f64b24ef1b	589ced18454387a57d97cd9149b7812ed65325b9ce96a4d50a892cb14d150919	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:46.523	db0bfaa11fd90af933397bfe46d792bcd04ebf4d3ec89c950c9a6005075858f4	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:44.473
ebd3b211-e1e5-4e5a-9fea-0e25d334be2e	839f3441-a924-45aa-b78c-19f64b24ef1b	db0bfaa11fd90af933397bfe46d792bcd04ebf4d3ec89c950c9a6005075858f4	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:48.578	85410546848c798c42fe328f9a68bd296972d31ef2a1d9d1260c546ffc09eb3b	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:46.525
0f9d2a35-e9d9-4213-9f0c-9b0069b911e2	839f3441-a924-45aa-b78c-19f64b24ef1b	85410546848c798c42fe328f9a68bd296972d31ef2a1d9d1260c546ffc09eb3b	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:50.628	2027f83a88f1989836897705e33cbb3c3c5f2eebdbae77a9773d2c932c381e1f	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:48.58
563833e9-54f2-4ab4-b83e-5f3a93139ef3	839f3441-a924-45aa-b78c-19f64b24ef1b	2027f83a88f1989836897705e33cbb3c3c5f2eebdbae77a9773d2c932c381e1f	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:52.703	2d099664b0586c4cc994402d17993f07c7714c6b8c034af143968c18b1a1e50a	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:50.63
0f1b2ec7-f672-4b63-a426-802f44f19bd1	839f3441-a924-45aa-b78c-19f64b24ef1b	2d099664b0586c4cc994402d17993f07c7714c6b8c034af143968c18b1a1e50a	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:54.774	82ec8f8aded0cada040bdf0194a04aafa71443cb431af005742bd6d3e8d5fe0f	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:52.706
df716d43-8b90-497d-b22e-fb223152bef6	839f3441-a924-45aa-b78c-19f64b24ef1b	82ec8f8aded0cada040bdf0194a04aafa71443cb431af005742bd6d3e8d5fe0f	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:56.833	f00ab7f652cbb8ed5519070cfb6d28e9acaf59197ceaa31046cb7db829038826	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:54.776
a11822b0-1d97-4535-bbf1-2ab23fda1f5f	839f3441-a924-45aa-b78c-19f64b24ef1b	f00ab7f652cbb8ed5519070cfb6d28e9acaf59197ceaa31046cb7db829038826	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:19:58.886	905e481639f9fb714548653b42040be2b811ddc2ce8ef83ac2f0d8f75afa970a	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:56.834
cef8c97a-9401-488e-a521-674f1f9d7c8d	839f3441-a924-45aa-b78c-19f64b24ef1b	905e481639f9fb714548653b42040be2b811ddc2ce8ef83ac2f0d8f75afa970a	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:20:00.965	1bb2107b5138a979be9be4b9490905f21ce1aee52d95f2330292e5eac10ac129	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:19:58.888
0516b01e-b8e5-42c2-8001-19aa3f243084	839f3441-a924-45aa-b78c-19f64b24ef1b	33fc0672955dbc0bdc1931d23c4dfcdfb46eb136aa826adce9f9064b239d1bb7	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:20:05.102	e2c03bbe5d7ac4d3252cbf5d4a63137be15c44d83a909d8716c652ed600a5c45	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:20:03.039
dcfa569a-e225-43f2-aa35-e9005b98e0be	839f3441-a924-45aa-b78c-19f64b24ef1b	e2c03bbe5d7ac4d3252cbf5d4a63137be15c44d83a909d8716c652ed600a5c45	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:20:07.161	43427561bf301bf6ebdb20ba1d2aeaa16f86de7ee287b54afc3b8b73f689198c	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:20:05.104
95ddb83c-1180-4316-886d-41fe39d5cc3a	839f3441-a924-45aa-b78c-19f64b24ef1b	43427561bf301bf6ebdb20ba1d2aeaa16f86de7ee287b54afc3b8b73f689198c	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:20:09.257	c0132cbcc87dea65d4e661b20323901d6a3c3fe14f288728608f451a33423ddd	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:20:07.164
6b4eee8f-c235-4b96-bc98-7521ae846d2f	839f3441-a924-45aa-b78c-19f64b24ef1b	c0132cbcc87dea65d4e661b20323901d6a3c3fe14f288728608f451a33423ddd	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:20:11.325	23599496f4be1babf0f06141ba5228fd45a08d4dafec04bdbf2e3cd0e26f94a8	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:20:09.258
630adca3-f430-423a-a31a-e6e3856d647d	839f3441-a924-45aa-b78c-19f64b24ef1b	23599496f4be1babf0f06141ba5228fd45a08d4dafec04bdbf2e3cd0e26f94a8	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:24:44.951	dc4b60839afbe6dd6dfcfb50f529c78e5a67549625a54893aacc5b73c5007b94	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:20:11.327
ec7992a2-d6ca-4a2a-962e-9cb84f7db791	839f3441-a924-45aa-b78c-19f64b24ef1b	1bb2107b5138a979be9be4b9490905f21ce1aee52d95f2330292e5eac10ac129	cf872a3c-a51f-40df-95e4-aa1915d3bf62	2026-09-11 03:20:03.037	33fc0672955dbc0bdc1931d23c4dfcdfb46eb136aa826adce9f9064b239d1bb7	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:20:00.968
40ae9d67-e5c3-4bca-88a5-76cbea975fef	839f3441-a924-45aa-b78c-19f64b24ef1b	dc4b60839afbe6dd6dfcfb50f529c78e5a67549625a54893aacc5b73c5007b94	cf872a3c-a51f-40df-95e4-aa1915d3bf62	\N	\N	2026-10-11 03:19:40.006	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:44.955
1fe4de2e-18b6-476b-864e-00a4d2eb56d0	839f3441-a924-45aa-b78c-19f64b24ef1b	29d66da25c080e20957631e0d9cc3c06adea90f157719729ff98026893ee8264	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:47.681	b8ffaec2ba153e899a0f0b976c892a0fd50db72c57b7a64be2d7e323ac154e56	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:47.373
29e8df19-86a0-4df7-b9ec-0e9a6b765ef1	839f3441-a924-45aa-b78c-19f64b24ef1b	b8ffaec2ba153e899a0f0b976c892a0fd50db72c57b7a64be2d7e323ac154e56	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:49.673	7f5e21ecaa150c387cf57a05bf9b0f64fac497c1e932f8b7f54125d14a2c470b	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:47.683
c9471739-786f-4cf4-8f4d-409ee842d31a	839f3441-a924-45aa-b78c-19f64b24ef1b	7f5e21ecaa150c387cf57a05bf9b0f64fac497c1e932f8b7f54125d14a2c470b	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:51.727	a8aafdfe9d7dac865b61e68ebcae29e4f2a4a574ee7a2404ed5fbb2b5559df0d	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:49.675
383a1b03-3882-4437-9e95-608cf6270776	839f3441-a924-45aa-b78c-19f64b24ef1b	a8aafdfe9d7dac865b61e68ebcae29e4f2a4a574ee7a2404ed5fbb2b5559df0d	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:53.809	a4463a6965974b121a5cbc651b44d9df38402c34b0785c47cccaa3e671aaac54	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:51.729
82501f90-3263-4127-8397-a5909591e01a	839f3441-a924-45aa-b78c-19f64b24ef1b	a4463a6965974b121a5cbc651b44d9df38402c34b0785c47cccaa3e671aaac54	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:55.882	b77d14dcaf1194686bf5fff62b131057ec5b4963b5c9c3cfce083f328c11085c	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:53.811
c1ae3189-3b6c-4409-b0ee-d7676620efd3	839f3441-a924-45aa-b78c-19f64b24ef1b	b77d14dcaf1194686bf5fff62b131057ec5b4963b5c9c3cfce083f328c11085c	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:57.919	0b8c180f20c532a18deae08f602943bb5645695cbc0cea1534413ca458ce3f41	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:55.884
1f69ee53-83b9-4581-82a5-18c2ac45d92a	839f3441-a924-45aa-b78c-19f64b24ef1b	0b8c180f20c532a18deae08f602943bb5645695cbc0cea1534413ca458ce3f41	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:24:59.979	39efdb4de5957fd565227a5996e23475d5514f4b16152660f03afa370e35d3ab	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:57.92
d917b076-f087-41f9-80f8-342ea79a2034	839f3441-a924-45aa-b78c-19f64b24ef1b	39efdb4de5957fd565227a5996e23475d5514f4b16152660f03afa370e35d3ab	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:02.084	97df6ca6e69a1c06ff137a6e4a535fe1e107abe5aeb05cc27f84ef29d119a2e7	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:24:59.984
4dac37be-d4c8-4fb2-b5f6-8cd0d4c7a33f	839f3441-a924-45aa-b78c-19f64b24ef1b	97df6ca6e69a1c06ff137a6e4a535fe1e107abe5aeb05cc27f84ef29d119a2e7	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:04.135	001d3dd40a87b9bea650fa443d57107675ab66312e7d3c2a9b83f6ffad447be7	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:02.087
ef6f5b9c-4676-4450-8351-bc76fc82f2b5	839f3441-a924-45aa-b78c-19f64b24ef1b	001d3dd40a87b9bea650fa443d57107675ab66312e7d3c2a9b83f6ffad447be7	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:06.186	5af06595d934b3ad438ec1327845ec9e1dfa8724d8190560a54b183f23f6055b	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:04.137
b0fb8948-9800-48d2-a71d-4e1efa3a2bc8	839f3441-a924-45aa-b78c-19f64b24ef1b	5af06595d934b3ad438ec1327845ec9e1dfa8724d8190560a54b183f23f6055b	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:08.265	57b77ca2459e85e102a6d4a63d0e1da5346de708af3491ade6c7ffe1dac7a607	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:06.188
0654c739-76f5-4939-9f93-1bc3b96a8fbd	839f3441-a924-45aa-b78c-19f64b24ef1b	57b77ca2459e85e102a6d4a63d0e1da5346de708af3491ade6c7ffe1dac7a607	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:10.3	48894b4d0c158414d8b0c596c6d3834a07d2fa129346af7df37c2643beedffcb	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:08.267
dec195c7-372b-4d03-a715-1b93d008ddfd	839f3441-a924-45aa-b78c-19f64b24ef1b	48894b4d0c158414d8b0c596c6d3834a07d2fa129346af7df37c2643beedffcb	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:12.404	74e91d7800cda07a2164ad7aa58ab70ffa064c1350127f7d4f7673bb31db2545	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:10.302
51fd54f1-5389-42fa-89ce-53c715266f9d	839f3441-a924-45aa-b78c-19f64b24ef1b	74e91d7800cda07a2164ad7aa58ab70ffa064c1350127f7d4f7673bb31db2545	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:14.448	7efeb162bd00f50162d1841baf8088f6c98576c40e6efa8978e7289876406647	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:12.407
f47df403-74f1-494c-9abe-3f554f775c7f	839f3441-a924-45aa-b78c-19f64b24ef1b	7efeb162bd00f50162d1841baf8088f6c98576c40e6efa8978e7289876406647	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:16.545	ecc3f3332b5b53cff982d5fdb4c6df22011a45f34b3ce064341d6015205409ba	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:14.45
100a4932-6069-4a00-9873-b0d5f7c05457	839f3441-a924-45aa-b78c-19f64b24ef1b	ecc3f3332b5b53cff982d5fdb4c6df22011a45f34b3ce064341d6015205409ba	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:25:18.611	786b690d605c58d85cca341bee2f1031d62826fd0b79a9d9158c9c442611d295	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:16.547
5facf3d6-a3a2-4045-abc1-2574c0e9e0a8	839f3441-a924-45aa-b78c-19f64b24ef1b	2e0be3c3266be2937d862ea1cc98cfde430dd5449f18433985e1b99de120e1e4	9459c8ba-65b1-43fb-ab10-85f03a119304	\N	\N	2026-10-11 03:29:51.287	\N	::1	curl/8.5.0	2026-09-11 03:29:51.291
bd97587f-e2fa-42da-92ae-af14b9af5a02	839f3441-a924-45aa-b78c-19f64b24ef1b	786b690d605c58d85cca341bee2f1031d62826fd0b79a9d9158c9c442611d295	a3ae627b-3741-447e-b25b-cd5a78e2c66e	2026-09-11 03:30:01.025	274bd0c0381c84594ebed3a6dc6ae0a9b608956e666e50db919f624d859f2010	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:25:18.613
8269a6df-ea25-4f64-942b-a073aa983e4b	839f3441-a924-45aa-b78c-19f64b24ef1b	274bd0c0381c84594ebed3a6dc6ae0a9b608956e666e50db919f624d859f2010	a3ae627b-3741-447e-b25b-cd5a78e2c66e	\N	\N	2026-10-11 03:24:47.371	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:01.029
6dbe6e32-fbb1-466d-afeb-2e21f95e0ed9	839f3441-a924-45aa-b78c-19f64b24ef1b	ad1bfcec2553d8cdecc6ecdd1a6e57abbbb7e2fdcd63ea177cf8b369addb1b31	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	\N	\N	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:33:02.738
324439e8-a702-4a5a-aa88-7db49d729c3b	839f3441-a924-45aa-b78c-19f64b24ef1b	c69609083f3f404de728c1c9d5c076bbf65e014e432a30b979da77bd412d19dd	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:03.838	e33e9c7b572edae231f344315980c478359f07b92311b14c242b294a7f8bf8f6	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:03.498
4a97149b-0f4c-471d-a2cd-23b98877c365	839f3441-a924-45aa-b78c-19f64b24ef1b	e33e9c7b572edae231f344315980c478359f07b92311b14c242b294a7f8bf8f6	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:05.822	c1de74d5eee25c987038da3d552b4cd3c93c72795627866aa3b9b1f16737b74a	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:03.841
2a28fc2b-db8e-4dea-800a-91813ca0c43e	839f3441-a924-45aa-b78c-19f64b24ef1b	c1de74d5eee25c987038da3d552b4cd3c93c72795627866aa3b9b1f16737b74a	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:07.882	a383efd8000b9fa3fe29ef0ce89b460f767889addee0ac24abf10b27ca047a59	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:05.825
c4860c6c-7834-4d8e-8011-bae7a3eb7ff8	839f3441-a924-45aa-b78c-19f64b24ef1b	a383efd8000b9fa3fe29ef0ce89b460f767889addee0ac24abf10b27ca047a59	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:09.963	519a7e7d2f573c93a8929c31f4697cddd497a3a86f5bc85b32bfae0cdd91747d	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:07.885
f609fd1e-d353-45fd-8f50-25da8dd07523	839f3441-a924-45aa-b78c-19f64b24ef1b	519a7e7d2f573c93a8929c31f4697cddd497a3a86f5bc85b32bfae0cdd91747d	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:12.011	f786d44cea11ddd14493ae28c49a81441d6b74e4657dc6829b9dc5f31cf4142d	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:09.966
9813a117-d004-40e9-9023-de4a0308be3b	839f3441-a924-45aa-b78c-19f64b24ef1b	f786d44cea11ddd14493ae28c49a81441d6b74e4657dc6829b9dc5f31cf4142d	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:14.076	7e30b85bd701ca712f953362496c2901377f0cdc2d0ee685d3a19840334b6351	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:12.014
47e49471-6071-4120-8986-1b54d2af1736	839f3441-a924-45aa-b78c-19f64b24ef1b	7e30b85bd701ca712f953362496c2901377f0cdc2d0ee685d3a19840334b6351	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:16.139	70237d8daad218db6e986721f254e28ed997792e25bd775b7605460a52cb50c4	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:14.079
989ce90a-a27a-4bad-bed5-ca84f0eb0cc4	839f3441-a924-45aa-b78c-19f64b24ef1b	70237d8daad218db6e986721f254e28ed997792e25bd775b7605460a52cb50c4	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:18.206	f527084f3354a874a0b5ee3c9e9b23948155da92259ff1cf31079e2a28d468ae	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:16.141
a7cbe962-6991-4b27-ba05-5bb88d4924da	839f3441-a924-45aa-b78c-19f64b24ef1b	a016c0e768d022fc3ccfc71657670e832203d93b5449f9b7f314985aea4df00d	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:28.533	8447bd98fb75db5c01e81803c93f3f9ea9e4f97d474e97f771bb9740e720ff67	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:26.479
680fc6c2-ed40-4969-907e-5ba843834c07	839f3441-a924-45aa-b78c-19f64b24ef1b	8447bd98fb75db5c01e81803c93f3f9ea9e4f97d474e97f771bb9740e720ff67	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:30.597	50f151279bd9f10c2d992837b2fe5771a57cb8337894c9464ffaee6f9d4888a1	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:28.535
8797091f-574b-48c7-a030-b7f4269bb3df	839f3441-a924-45aa-b78c-19f64b24ef1b	f527084f3354a874a0b5ee3c9e9b23948155da92259ff1cf31079e2a28d468ae	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:20.254	1e1ec74aa723bc46bf6944d35f033d8f8271f72910fce6d1a3f9cadebb4aa77a	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:18.208
d1e35bc3-83be-46e1-b436-bb6a659e630b	839f3441-a924-45aa-b78c-19f64b24ef1b	1e1ec74aa723bc46bf6944d35f033d8f8271f72910fce6d1a3f9cadebb4aa77a	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:22.342	e2cd9d2c9222002aaaa45ea770e0e88c152093bc0da6e98c2d9b332797d60709	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:20.256
f0545902-4840-40e9-8b62-0ecbc12b03fc	839f3441-a924-45aa-b78c-19f64b24ef1b	e2cd9d2c9222002aaaa45ea770e0e88c152093bc0da6e98c2d9b332797d60709	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:24.414	7e8ed85bc9434631b970533752e5c035a59c88fdc95b0fb42bc0ef41acdd3e5d	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:22.344
5f57a133-866c-4ffb-a51c-a4fc61524b4d	839f3441-a924-45aa-b78c-19f64b24ef1b	7e8ed85bc9434631b970533752e5c035a59c88fdc95b0fb42bc0ef41acdd3e5d	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:30:26.477	a016c0e768d022fc3ccfc71657670e832203d93b5449f9b7f314985aea4df00d	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:24.416
fc575563-dec5-493e-9cca-a9957e83151e	839f3441-a924-45aa-b78c-19f64b24ef1b	50f151279bd9f10c2d992837b2fe5771a57cb8337894c9464ffaee6f9d4888a1	73de17f8-6c32-432d-b6d0-6f22753453f3	2026-09-11 03:32:10.534	965dcf1fa6848af00262d7070ff1f65d2580023ea8e4763fb1c51658ecd7758a	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:30:30.599
bc787474-32c6-4a47-af7f-d5c3a6c3575e	839f3441-a924-45aa-b78c-19f64b24ef1b	965dcf1fa6848af00262d7070ff1f65d2580023ea8e4763fb1c51658ecd7758a	73de17f8-6c32-432d-b6d0-6f22753453f3	\N	\N	2026-10-11 03:30:03.496	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:10.536
248291b1-cf33-40a3-ad19-4897f57f7fc8	839f3441-a924-45aa-b78c-19f64b24ef1b	756174582147c9afa537993d30c4f9ee1c068ca34482eb0000a293c1dec49792	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:13.399	af5033d20c986dc43cc6cb41563c38a4281d7c5d6b1dd6e3810716bd2f9be3e1	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:13.04
87b831d9-3026-49ce-8b4f-22bd9d899b8b	839f3441-a924-45aa-b78c-19f64b24ef1b	af5033d20c986dc43cc6cb41563c38a4281d7c5d6b1dd6e3810716bd2f9be3e1	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:15.366	5bdd816902d4c0453d4d76f42a1189c7b60cfad3778fe699cfddcfc581ecef0e	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:13.401
498df9cc-c795-4ccd-84c0-99971d14e8b7	839f3441-a924-45aa-b78c-19f64b24ef1b	5bdd816902d4c0453d4d76f42a1189c7b60cfad3778fe699cfddcfc581ecef0e	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:17.441	fb657fe0880afb21f026a80717f52728567a8d23925e4c0b448113f5dcbd563d	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:15.368
d049690b-d3a0-4cbc-9529-4a661335d307	839f3441-a924-45aa-b78c-19f64b24ef1b	fb657fe0880afb21f026a80717f52728567a8d23925e4c0b448113f5dcbd563d	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:19.485	35692dffdad4225238ec110bd53582945ddef05850ed9afd566c4ba8e65e6db0	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:17.443
25f33466-d35a-4ea3-b2a9-ee8846b46a75	839f3441-a924-45aa-b78c-19f64b24ef1b	35692dffdad4225238ec110bd53582945ddef05850ed9afd566c4ba8e65e6db0	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:21.552	fa318d77c4d5bae40303124c5def5a7e908c3f1fccccd983000f3e572999d09b	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:19.487
628e8f60-8480-412d-862c-6858a650f9ee	839f3441-a924-45aa-b78c-19f64b24ef1b	fa318d77c4d5bae40303124c5def5a7e908c3f1fccccd983000f3e572999d09b	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:23.632	8c379feedadef3e6666519b3e9bca95a9951ea4b47533f7632690c2814657471	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:21.554
777b175b-cb82-4b3f-b9d2-144017ca415a	839f3441-a924-45aa-b78c-19f64b24ef1b	8c379feedadef3e6666519b3e9bca95a9951ea4b47533f7632690c2814657471	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:25.696	a65cbeee6df85ce2f9ad23a897c63207c4dd0695e2df9d6793bde4698bba7063	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:23.636
9ce52cfc-a88a-4e93-a001-a447a46477e9	839f3441-a924-45aa-b78c-19f64b24ef1b	a65cbeee6df85ce2f9ad23a897c63207c4dd0695e2df9d6793bde4698bba7063	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:27.776	5a49b11bf214d61b268b1871abf26363128adb328cff32c56e17e6e8e413dca5	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:25.698
9f3c51ed-21f3-4a8d-8a01-57bd57f1e8ad	839f3441-a924-45aa-b78c-19f64b24ef1b	5a49b11bf214d61b268b1871abf26363128adb328cff32c56e17e6e8e413dca5	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:29.823	ab7b35de71c3a186c40194df18b3236f09439bce859354dc2af2d56f514c9aca	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:27.778
1184db1f-2b2d-46eb-90b0-db3a5c8238ce	839f3441-a924-45aa-b78c-19f64b24ef1b	ab7b35de71c3a186c40194df18b3236f09439bce859354dc2af2d56f514c9aca	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:31.872	9abbdeb9d464ce72516c531fd152b484eb710fdc6da0475ee02e5198b670b7c0	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:29.824
42df4f7a-fc4c-4fbf-8547-4e92bcf4213f	839f3441-a924-45aa-b78c-19f64b24ef1b	9abbdeb9d464ce72516c531fd152b484eb710fdc6da0475ee02e5198b670b7c0	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:33.96	e6a63aec7eb23a418a9d1af3c345bd1cce82325f96dfdacbc9bb8bfa5ba79460	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:31.874
14fc7746-4465-44fe-bfd0-ac8b7314378e	839f3441-a924-45aa-b78c-19f64b24ef1b	e6a63aec7eb23a418a9d1af3c345bd1cce82325f96dfdacbc9bb8bfa5ba79460	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:36.031	a0c142e6b51395e9b7317879ec2f7695e2f358847b543b796afdd7aaf5f997c6	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:33.962
7fc70a51-3cf3-4c29-a1d9-ad97172d8300	839f3441-a924-45aa-b78c-19f64b24ef1b	a0c142e6b51395e9b7317879ec2f7695e2f358847b543b796afdd7aaf5f997c6	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:38.082	9e24c0f066d0054b60ab23c053404d05f3bd79f0579219fdcb4d659b27b5012e	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:36.033
93eb5af4-6baf-438b-9be3-5fbe525c1728	839f3441-a924-45aa-b78c-19f64b24ef1b	9e24c0f066d0054b60ab23c053404d05f3bd79f0579219fdcb4d659b27b5012e	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:32:40.144	8f3b9fa12dd9709d887d34aba185695f127ee5f979a4f6cf6410c5625b361194	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:38.084
13daf1a2-14a7-45e9-af1c-eab11c203fe2	839f3441-a924-45aa-b78c-19f64b24ef1b	8f3b9fa12dd9709d887d34aba185695f127ee5f979a4f6cf6410c5625b361194	22d9cc32-6543-4fdd-be93-1d8d7eb2029f	2026-09-11 03:33:02.735	ad1bfcec2553d8cdecc6ecdd1a6e57abbbb7e2fdcd63ea177cf8b369addb1b31	2026-10-11 03:32:13.039	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:32:40.146
1b093a95-a39b-4aa4-a0e4-61c6901778ca	839f3441-a924-45aa-b78c-19f64b24ef1b	df020839e1bb6d39209368d15eb50b9b4bb1a51a44d1d97d8d5c48c9939c6904	a42d0807-4d40-48e9-8eb0-b05dcd24761f	2026-09-11 03:33:05.509	22e287b5ced6601edcc878ea530d9c39aa76a8577846f32799182168f000294d	2026-10-11 03:33:05.163	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:33:05.165
aa2c6761-fd82-4081-954e-50d9f4e30abb	839f3441-a924-45aa-b78c-19f64b24ef1b	22e287b5ced6601edcc878ea530d9c39aa76a8577846f32799182168f000294d	a42d0807-4d40-48e9-8eb0-b05dcd24761f	2026-09-11 03:33:07.487	05d38356dafcd24649a2398793db744db67f58a84c996bbfb7cfb901aa0b93d9	2026-10-11 03:33:05.163	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:33:05.51
bbf83a8f-e734-4b30-9242-ba79fb5814a9	839f3441-a924-45aa-b78c-19f64b24ef1b	ee37c2f5a639093dc489f2be3bfa08b8eef4ce69e737e02ce03c9f1757f5f488	a0314d7f-77ba-412a-b211-a4532d3126b1	2026-09-11 03:37:17.227	defac62e2171a950cb60f9a084795e5cc437bfc60335771dd4eaca948fa07cd6	2026-10-11 03:37:15.984	\N	::1	curl/8.5.0	2026-09-11 03:37:15.987
c379fdfa-158f-4916-ad18-c14131fbb33e	839f3441-a924-45aa-b78c-19f64b24ef1b	defac62e2171a950cb60f9a084795e5cc437bfc60335771dd4eaca948fa07cd6	a0314d7f-77ba-412a-b211-a4532d3126b1	2026-09-11 03:37:17.453	\N	2026-10-11 03:37:15.984	\N	::1	curl/8.5.0	2026-09-11 03:37:17.233
4df9151e-1fdd-46b5-a1a7-ef11a4c9f0b2	839f3441-a924-45aa-b78c-19f64b24ef1b	8de3ba01755f87499f87a39c57ce55ebfe29933b2449a0c3ddff153255c21761	b6108103-f72b-4eb0-8a47-11dd1c10a5be	2026-09-11 04:00:50.954	753bde3285de820d83430df2b881a58289d8954f57fe293e256f06470955fe6e	2026-10-11 03:45:50.456	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 03:45:50.458
6b55d3da-ddb2-4ff3-997b-7e889fe15f55	839f3441-a924-45aa-b78c-19f64b24ef1b	a32b4415e3cd1d7dec81973790e38fafedaab4af8c494c78088e68d83d4b30b5	7ef52e74-d9e1-4f3e-9438-4fd1d4083a46	\N	\N	2026-10-11 04:03:38.542	\N	::1	curl/8.5.0	2026-09-11 04:03:38.544
3a680cee-0f72-42e6-b052-95c2add4c9dd	839f3441-a924-45aa-b78c-19f64b24ef1b	6004c811e4454bb129ab4b52a4b5043ac8a6b299fe948ba2942eecee99e4f5de	9ab4e025-707f-43be-ab7b-6a67ca30d8f8	\N	\N	2026-10-11 04:03:48.18	\N	::1	curl/8.5.0	2026-09-11 04:03:48.182
b3439fa8-d716-45b5-8cc3-c58766301148	839f3441-a924-45aa-b78c-19f64b24ef1b	44a1a3b287a110b7fd150a70e0a816fd450818c8d434c94e3482e2cb0d65e9be	fb9e3349-2a31-4938-8c5e-3746728db3c2	\N	\N	2026-10-11 04:03:58.447	\N	::1	curl/8.5.0	2026-09-11 04:03:58.449
59b3e426-751d-476b-bea2-66afd1cf59f9	839f3441-a924-45aa-b78c-19f64b24ef1b	05d38356dafcd24649a2398793db744db67f58a84c996bbfb7cfb901aa0b93d9	a42d0807-4d40-48e9-8eb0-b05dcd24761f	2026-09-11 04:04:22.289	369c978a7e806e7c69292c21f277ab0b2b761bdae36a625bb3a587e9ad97bd93	2026-10-11 03:33:05.163	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 03:33:07.489
a139a801-14e2-447d-9fb0-e07baa167832	839f3441-a924-45aa-b78c-19f64b24ef1b	369c978a7e806e7c69292c21f277ab0b2b761bdae36a625bb3a587e9ad97bd93	a42d0807-4d40-48e9-8eb0-b05dcd24761f	\N	\N	2026-10-11 03:33:05.163	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:04:22.29
9a2a183a-01b8-4cf1-a7e4-3537fa648a5b	839f3441-a924-45aa-b78c-19f64b24ef1b	c22cb59cb0e2d5e4351900cea67f705c15ebef4b21d5c7433db9cd14df705f1f	87dbd540-9837-4f3f-b0bf-41505637bacb	2026-09-11 04:04:32.178	b4fc3fd1ae59d444b36dbafa10d33598825a0f941e3130b157979e2c7016c7b2	2026-10-11 04:04:24.777	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:04:24.778
ef6a344c-13ca-494e-85f8-7f41df915c2b	839f3441-a924-45aa-b78c-19f64b24ef1b	b4fc3fd1ae59d444b36dbafa10d33598825a0f941e3130b157979e2c7016c7b2	87dbd540-9837-4f3f-b0bf-41505637bacb	\N	\N	2026-10-11 04:04:24.777	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:04:32.181
79262e30-2b41-46d3-83b4-ecc3eba759b3	839f3441-a924-45aa-b78c-19f64b24ef1b	a5e81ff46278b21e0894a78e05541ecac150a60e7cfa9f4da03b5bcd3c173483	4a963207-4473-4c61-bfb5-4b78634f68ed	2026-09-11 04:04:35.278	0c04542242a4b39ff59739844c2d4cd84c18d52156dbf8d7c269e86677edf242	2026-10-11 04:04:35.021	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:04:35.022
bcec3ecc-3000-402e-9e65-2cd632bc29f1	839f3441-a924-45aa-b78c-19f64b24ef1b	0c04542242a4b39ff59739844c2d4cd84c18d52156dbf8d7c269e86677edf242	4a963207-4473-4c61-bfb5-4b78634f68ed	2026-09-11 04:04:38.832	ba406a5bd091e06cc1edda0eef8e175770e878531cb5cc387ff90cd07be8c3f1	2026-10-11 04:04:35.021	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:04:35.28
2d095694-0335-4907-8d08-09b9daffb281	839f3441-a924-45aa-b78c-19f64b24ef1b	ba406a5bd091e06cc1edda0eef8e175770e878531cb5cc387ff90cd07be8c3f1	4a963207-4473-4c61-bfb5-4b78634f68ed	2026-09-11 04:07:53.854	b4978fdbc22189fde2b8f1c7ba1667cb6c6e070cc482359ebbe933ff74e7f5f5	2026-10-11 04:04:35.021	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:04:38.834
d3732d78-2866-464b-b962-8e4c3ed3db8d	839f3441-a924-45aa-b78c-19f64b24ef1b	b4978fdbc22189fde2b8f1c7ba1667cb6c6e070cc482359ebbe933ff74e7f5f5	4a963207-4473-4c61-bfb5-4b78634f68ed	\N	\N	2026-10-11 04:04:35.021	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:07:53.855
fa9b900a-850b-4198-a5cc-053c1896099a	839f3441-a924-45aa-b78c-19f64b24ef1b	3bb1652c3b8396b91e887ab5de54cc3af5c76118e8aafb2dab371e0d7592b0cc	c46d95b7-f4b9-4133-91b4-0c982ff3c4ba	2026-09-11 04:07:57.558	9a75f8d27bfcbdfc3178755413c9a32699fc8fe76602269c406c39f9e2fbc2ee	2026-10-11 04:07:57.291	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:07:57.292
f233b86d-bf9c-4252-ab07-0c3156bd0259	839f3441-a924-45aa-b78c-19f64b24ef1b	9a75f8d27bfcbdfc3178755413c9a32699fc8fe76602269c406c39f9e2fbc2ee	c46d95b7-f4b9-4133-91b4-0c982ff3c4ba	2026-09-11 04:08:01.212	23851e78c059976d31f867cabefa85e1d207d49eb957c33f8e27490ed8287ac8	2026-10-11 04:07:57.291	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:07:57.56
cafc5b0e-a39c-4e38-95dd-f024679974a0	839f3441-a924-45aa-b78c-19f64b24ef1b	23851e78c059976d31f867cabefa85e1d207d49eb957c33f8e27490ed8287ac8	c46d95b7-f4b9-4133-91b4-0c982ff3c4ba	2026-09-11 04:09:00.654	8e4b56d6dc12a634ef2f5c9445b48fd642578fd1c78d85921f587d1c21123114	2026-10-11 04:07:57.291	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:08:01.213
226fa3df-dccc-48b5-8be5-bac115e9481f	839f3441-a924-45aa-b78c-19f64b24ef1b	8e4b56d6dc12a634ef2f5c9445b48fd642578fd1c78d85921f587d1c21123114	c46d95b7-f4b9-4133-91b4-0c982ff3c4ba	\N	\N	2026-10-11 04:07:57.291	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:09:00.657
b6352f88-03fa-468f-882a-61e2b8f66f03	839f3441-a924-45aa-b78c-19f64b24ef1b	91747d460f5df39595d052a670a0a60fd6836922d2c2a8904d3b32d22dab1d63	754e0ec5-16ec-4458-8fa9-4ddbbee46008	2026-09-11 04:09:04.774	86aa82481f8cbd72e31e941a101081b724b8834c80194d875cb18d0082d4d197	2026-10-11 04:09:04.461	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:09:04.463
5b8f47cf-455e-4375-b322-0471681c8cce	839f3441-a924-45aa-b78c-19f64b24ef1b	86aa82481f8cbd72e31e941a101081b724b8834c80194d875cb18d0082d4d197	754e0ec5-16ec-4458-8fa9-4ddbbee46008	2026-09-11 04:09:08.319	cf0cf2b3902a8f128eb4443591f829b05bf911a20765ee0f6bc678c19ffd7be3	2026-10-11 04:09:04.461	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:09:04.775
9df07bd2-d12e-4b2d-8d5a-439c569572cd	839f3441-a924-45aa-b78c-19f64b24ef1b	cf0cf2b3902a8f128eb4443591f829b05bf911a20765ee0f6bc678c19ffd7be3	754e0ec5-16ec-4458-8fa9-4ddbbee46008	2026-09-11 04:10:29.272	d645b0d8327b186280f9e1dabdfecff61c48b93b0cfd47ba26a63f4fbebf8e0c	2026-10-11 04:09:04.461	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:09:08.321
1d85e193-c6c0-4f0f-a316-8b32e1946cf7	839f3441-a924-45aa-b78c-19f64b24ef1b	753bde3285de820d83430df2b881a58289d8954f57fe293e256f06470955fe6e	b6108103-f72b-4eb0-8a47-11dd1c10a5be	2026-09-11 04:15:56.962	3e507c9c301b4a10c28cf139bdb838a4c6a3d1f20bfb842e857f22aecefbc5e6	2026-10-11 03:45:50.456	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 04:00:50.956
f9005395-8ad9-4ce2-97a1-b0414aaffb8e	839f3441-a924-45aa-b78c-19f64b24ef1b	d645b0d8327b186280f9e1dabdfecff61c48b93b0cfd47ba26a63f4fbebf8e0c	754e0ec5-16ec-4458-8fa9-4ddbbee46008	\N	\N	2026-10-11 04:09:04.461	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:10:29.276
3d3b37c6-bd5f-41e5-bd40-83fd65332ccd	839f3441-a924-45aa-b78c-19f64b24ef1b	98d16cb28d7173efd2234f6fe372b071b30df1106182afaaefe2d2a99aef2753	1a0d4279-7a22-4cac-a314-07aff1185666	2026-09-11 04:10:31.525	2bcd315e59b34c3aeb30ac2880394562e9e1d9de891f45313304b2aa692706a7	2026-10-11 04:10:31.236	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:10:31.237
fe088cef-203c-4682-a387-af0d964a8f63	839f3441-a924-45aa-b78c-19f64b24ef1b	2bcd315e59b34c3aeb30ac2880394562e9e1d9de891f45313304b2aa692706a7	1a0d4279-7a22-4cac-a314-07aff1185666	2026-09-11 04:10:35.237	ea0fe13a40a22bfe44017bc3fb54011c42fbc261ea21e8f5e7a50134a65102da	2026-10-11 04:10:31.236	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:10:31.527
098aeff0-9562-4f60-8c83-5bd581ab1664	839f3441-a924-45aa-b78c-19f64b24ef1b	ea0fe13a40a22bfe44017bc3fb54011c42fbc261ea21e8f5e7a50134a65102da	1a0d4279-7a22-4cac-a314-07aff1185666	2026-09-11 04:11:18.797	bd6be126d21c0c61829012656d26385f17f91e15ade9f25cd939b7c8fe8e2b7d	2026-10-11 04:10:31.236	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:10:35.239
15f3a105-ac51-4bf2-a659-d688a27bacd9	839f3441-a924-45aa-b78c-19f64b24ef1b	bd6be126d21c0c61829012656d26385f17f91e15ade9f25cd939b7c8fe8e2b7d	1a0d4279-7a22-4cac-a314-07aff1185666	\N	\N	2026-10-11 04:10:31.236	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:11:18.799
aff6ac60-5bd7-462a-a634-b281e080d047	839f3441-a924-45aa-b78c-19f64b24ef1b	417fc72a7c5f40c2c36a40a19f5492959864cd6a00eaa27d520e44a06ab157e8	399ec5dd-0715-43e2-8987-7099a4ee6743	2026-09-11 04:11:21.066	aea7550ff84851073567ce131b7bf745c5cc5c8155d92280718e08d8be254ad1	2026-10-11 04:11:20.754	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:11:20.756
e4a2b08d-04bd-4c50-a99f-fb9fc4d356be	839f3441-a924-45aa-b78c-19f64b24ef1b	aea7550ff84851073567ce131b7bf745c5cc5c8155d92280718e08d8be254ad1	399ec5dd-0715-43e2-8987-7099a4ee6743	2026-09-11 04:11:56.252	1d4ff824895df5711208308caffc750ab0b55eb512c199b533dde0a265d6f21b	2026-10-11 04:11:20.754	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:11:21.068
3f140297-6f1e-4896-b115-0eab734d6d76	839f3441-a924-45aa-b78c-19f64b24ef1b	1d4ff824895df5711208308caffc750ab0b55eb512c199b533dde0a265d6f21b	399ec5dd-0715-43e2-8987-7099a4ee6743	\N	\N	2026-10-11 04:11:20.754	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:11:56.254
09579132-4ee9-4514-bee9-ec3c9496ae5a	839f3441-a924-45aa-b78c-19f64b24ef1b	9f38ed0950c30492913c2d6398a5d8792c2b230da8cb8d6a1a94092a6e8a06b8	44584c10-371c-4acc-b104-506f64f05bc6	2026-09-11 04:11:58.455	ff5e3d7ff1d06f53ca502c7b47e11f9de48d6a035f1fc2dcfc74aff91aa213ae	2026-10-11 04:11:58.16	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:11:58.161
59c535b2-c8de-4f13-bf57-7af4ac792484	839f3441-a924-45aa-b78c-19f64b24ef1b	ff5e3d7ff1d06f53ca502c7b47e11f9de48d6a035f1fc2dcfc74aff91aa213ae	44584c10-371c-4acc-b104-506f64f05bc6	2026-09-11 04:12:56.523	31e63ca93b96ef96b8de2a64f9ff5192433d3806e04ed10b2b2d637487b66efa	2026-10-11 04:11:58.16	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:11:58.457
b64a3e0a-73c2-469e-8a42-225db8571ee6	839f3441-a924-45aa-b78c-19f64b24ef1b	31e63ca93b96ef96b8de2a64f9ff5192433d3806e04ed10b2b2d637487b66efa	44584c10-371c-4acc-b104-506f64f05bc6	2026-09-11 04:13:47.817	dbba68b5138fc8f0ddde373b98b3bd2188c81be4d30bf610d68355e96b6373d8	2026-10-11 04:11:58.16	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:12:56.525
04826c8a-b9fe-4ea1-a377-dd6866db7a44	839f3441-a924-45aa-b78c-19f64b24ef1b	dbba68b5138fc8f0ddde373b98b3bd2188c81be4d30bf610d68355e96b6373d8	44584c10-371c-4acc-b104-506f64f05bc6	\N	\N	2026-10-11 04:11:58.16	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:13:47.82
22b57922-4a12-46ae-b0e3-71f523f8c6b9	839f3441-a924-45aa-b78c-19f64b24ef1b	4e9a5fc207c520bb65fc86e9248b46faa0511a9c3e270f33bb77daf7983a9343	29af4393-c868-4a55-b7cd-305258f19abb	2026-09-11 04:13:50.33	2e91fbbafc0b063737a19d3f9d008185ab1d67620c09be89ad8b6260e8b14eb6	2026-10-11 04:13:49.877	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:13:49.878
861fbf9c-b11a-482d-955e-a89ca0a94219	839f3441-a924-45aa-b78c-19f64b24ef1b	2e91fbbafc0b063737a19d3f9d008185ab1d67620c09be89ad8b6260e8b14eb6	29af4393-c868-4a55-b7cd-305258f19abb	2026-09-11 04:14:54.228	f0593f3bedc0b37d8247344fbabdf72e3cf67e7278d56d2d21fff1289e0b49fc	2026-10-11 04:13:49.877	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:13:50.332
eaf98735-78d1-432a-ac04-087998e473b2	839f3441-a924-45aa-b78c-19f64b24ef1b	f0593f3bedc0b37d8247344fbabdf72e3cf67e7278d56d2d21fff1289e0b49fc	29af4393-c868-4a55-b7cd-305258f19abb	\N	\N	2026-10-11 04:13:49.877	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:14:54.23
35a93c3c-16d0-466b-b6eb-9602e09b99ca	839f3441-a924-45aa-b78c-19f64b24ef1b	31cdc8ab724706fe623fd7625685a3977bbb8270bd5976b2f9bc58a9e2edb593	6490fa5f-3fdc-4e39-996e-c8ddd1bc0e8d	2026-09-11 04:14:56.437	acf3af923af8fd1790b535d29e4c5f2b3c66f6c8a45a4287ad89478ac8270ed2	2026-10-11 04:14:56.178	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:14:56.179
532ced9f-6cae-420c-9a06-9031b89ae137	839f3441-a924-45aa-b78c-19f64b24ef1b	acf3af923af8fd1790b535d29e4c5f2b3c66f6c8a45a4287ad89478ac8270ed2	6490fa5f-3fdc-4e39-996e-c8ddd1bc0e8d	2026-09-11 04:15:00.256	5ec3229537ac918a5797bce7d0d86fae6cb2ddb311dd44c869882c00a0e6c6d2	2026-10-11 04:14:56.178	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:14:56.439
c3bbe35a-ea1e-4c79-ba18-69c9ee41686b	839f3441-a924-45aa-b78c-19f64b24ef1b	5ec3229537ac918a5797bce7d0d86fae6cb2ddb311dd44c869882c00a0e6c6d2	6490fa5f-3fdc-4e39-996e-c8ddd1bc0e8d	\N	\N	2026-10-11 04:14:56.178	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:00.258
81729a84-4236-4a21-bffe-3fbb0c1a42b5	839f3441-a924-45aa-b78c-19f64b24ef1b	49868a872a75cda114dc56e5f9dab74718277fecf51e8951a7b5dddad59c21a7	6119d1e1-00a8-4bc0-9e34-675f032e98dd	2026-09-11 04:15:02.477	bcb3893498264a48125453787e0b597285a95a8ed218087355df0485ec0d8ac9	2026-10-11 04:15:02.197	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:02.198
2e052514-0104-42b8-8354-666a53b4beb7	839f3441-a924-45aa-b78c-19f64b24ef1b	bcb3893498264a48125453787e0b597285a95a8ed218087355df0485ec0d8ac9	6119d1e1-00a8-4bc0-9e34-675f032e98dd	2026-09-11 04:15:06.373	45c423ad5824752a711014939098226bd042e3632f6d03a34333f46dcaaa4184	2026-10-11 04:15:02.197	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:02.479
e8a6f057-468f-4e19-9255-a1683676c32a	839f3441-a924-45aa-b78c-19f64b24ef1b	45c423ad5824752a711014939098226bd042e3632f6d03a34333f46dcaaa4184	6119d1e1-00a8-4bc0-9e34-675f032e98dd	\N	\N	2026-10-11 04:15:02.197	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:06.375
e73bdc4f-cb18-4aaa-9043-87ae317f028b	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	a4c2e715d8e9c10fb338c24b5e1439d68d69626dfd43ea338b01dc290e25823a	b0cf0964-3f45-4c90-a9e3-482b2d43ec77	\N	\N	2026-10-11 05:54:42.511	\N	::1	curl/8.5.0	2026-09-11 05:54:42.512
7f7232f3-2096-4e5f-97ed-8ade65b22a3f	839f3441-a924-45aa-b78c-19f64b24ef1b	fc8f1774ad7d27dc366313a6113899b26abaa3d149ffe1ea486efb7b376a4afd	f870c8df-c20b-4e4e-a29e-7df1b355fcaa	\N	\N	2026-10-11 05:54:44.904	\N	::1	curl/8.5.0	2026-09-11 05:54:44.906
45825b8a-2ead-44b5-886e-9b962172d645	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	3de9c8d6063f40b74a919b9df749e31d4f9be642c5717fc505d486f773e7ee7c	6681c0a0-3683-4b19-b62a-783195ca7b07	\N	\N	2026-10-11 05:55:12.741	\N	::1	curl/8.5.0	2026-09-11 05:55:12.742
cad07a64-3f63-4622-9c45-61c76da5ecdd	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	96be5a5715e23fc4013d6ed2857def1496e024fb5b13a1794d380b14dc502257	9737c1c4-e7c0-4642-8160-ad19900c00df	\N	\N	2026-10-11 05:55:15.859	\N	::1	curl/8.5.0	2026-09-11 05:55:15.86
48107f24-31ab-4b3b-9b31-96cdbb84209c	839f3441-a924-45aa-b78c-19f64b24ef1b	d6c885e54e5ab7d8071734925208d62b7bbb1067b74744e1e30c95d76b826341	fdfb73f9-478e-4a80-9f61-252054b42123	2026-09-11 04:15:09.15	b25fb8916f3c7359221a356a2668df6f9588311b434320bb68d55a854a6b9bca	2026-10-11 04:15:08.879	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:08.881
eb759625-ad0e-4c26-afba-81b57ebed679	839f3441-a924-45aa-b78c-19f64b24ef1b	b25fb8916f3c7359221a356a2668df6f9588311b434320bb68d55a854a6b9bca	fdfb73f9-478e-4a80-9f61-252054b42123	2026-09-11 04:15:12.95	d5461d857151b282a8cd40c756d9019f84ca8b0e4f359466b65823079e286bdb	2026-10-11 04:15:08.879	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:09.152
3f7ed348-a35b-475f-86b5-d2a79682e4f9	839f3441-a924-45aa-b78c-19f64b24ef1b	d5461d857151b282a8cd40c756d9019f84ca8b0e4f359466b65823079e286bdb	fdfb73f9-478e-4a80-9f61-252054b42123	2026-09-11 04:15:37.066	67173e25918f48ab10ba6d1f25e438cdb41a6f6b85fbb7665036b53b1036b58e	2026-10-11 04:15:08.879	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:12.952
f941fd11-19a2-4cb1-a8a1-dc4b57ec911b	839f3441-a924-45aa-b78c-19f64b24ef1b	67173e25918f48ab10ba6d1f25e438cdb41a6f6b85fbb7665036b53b1036b58e	fdfb73f9-478e-4a80-9f61-252054b42123	\N	\N	2026-10-11 04:15:08.879	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:37.071
893f410d-774f-4595-a089-9a6e24473e97	839f3441-a924-45aa-b78c-19f64b24ef1b	cdd17b328f1b890b32dfed276a651a38b3cc312c5a0f41b63b1d7269b950eb8e	e952cabc-323a-442d-925d-6b3387a64a11	2026-09-11 04:15:39.471	59a666875cc9e697f1fb33dc58e34d31117dcb7fcc7727573c26865dfcfa8b60	2026-10-11 04:15:39.082	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:39.085
e6611358-a5eb-4d2d-bcca-7cca3ab04448	839f3441-a924-45aa-b78c-19f64b24ef1b	0f0a07afc9426862378e6bd8ec02f5cf04f1b8a80bcd6fe40b2b60a76d614ebe	6ed6ee09-aff8-459a-9365-c21489c061ce	2026-09-11 04:16:02.671	22687457267f5899ed15760fac4388b3308deb29384956c1d3ce1e2cb2cb1041	2026-10-11 04:16:01.513	\N	::1	curl/8.5.0	2026-09-11 04:16:01.515
d7636739-4cd6-4914-981f-470cb96c79f7	839f3441-a924-45aa-b78c-19f64b24ef1b	22687457267f5899ed15760fac4388b3308deb29384956c1d3ce1e2cb2cb1041	6ed6ee09-aff8-459a-9365-c21489c061ce	2026-09-11 04:16:02.743	\N	2026-10-11 04:16:01.513	\N	::1	curl/8.5.0	2026-09-11 04:16:02.672
4bd7c362-c741-4c29-9170-39d6f59e3fbd	839f3441-a924-45aa-b78c-19f64b24ef1b	59a666875cc9e697f1fb33dc58e34d31117dcb7fcc7727573c26865dfcfa8b60	e952cabc-323a-442d-925d-6b3387a64a11	2026-09-11 04:19:56.949	d2b23926269f6626e0742f19857434e696469c33f6fac94adad73e5735c85054	2026-10-11 04:15:39.082	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:15:39.473
ff42f872-cdc9-442d-b2c2-98beef93e3a3	839f3441-a924-45aa-b78c-19f64b24ef1b	d2b23926269f6626e0742f19857434e696469c33f6fac94adad73e5735c85054	e952cabc-323a-442d-925d-6b3387a64a11	2026-09-11 04:24:22.937	\N	2026-10-11 04:15:39.082	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 04:19:56.952
18fe3e23-3133-49ac-bf1b-d2a8336d2f8f	839f3441-a924-45aa-b78c-19f64b24ef1b	3e507c9c301b4a10c28cf139bdb838a4c6a3d1f20bfb842e857f22aecefbc5e6	b6108103-f72b-4eb0-8a47-11dd1c10a5be	2026-09-11 04:28:54.938	\N	2026-10-11 03:45:50.456	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 04:15:56.963
2b631b8d-1d09-49e1-b1b2-a6b105f024e1	839f3441-a924-45aa-b78c-19f64b24ef1b	f6d5230c68956f6bc69f2b7b07eaf7593746df67823e8c0a8ecfab15b19c8bc2	ac970b35-1ae6-48ae-926b-d58a29e232b8	\N	\N	2026-10-11 05:19:12.633	\N	::1	curl/8.5.0	2026-09-11 05:19:12.635
8cd944ae-6b2c-4753-99dd-3f6394c909aa	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	f885da39ebdea41c40df0b746f5da4cef895ea754ca77ff697c8252c3163f52f	3680f056-3c67-4eae-a852-9942668929bd	\N	\N	2026-10-11 05:39:51.476	\N	::1	curl/8.5.0	2026-09-11 05:39:51.478
450eb2fd-5809-48fc-8868-84a1d2f19a83	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	c58562c095480e9c8dc49a983412ebd6a3cae47c30b666dc7a2dc0805648f834	44a90ea6-5ef4-4eb3-b0f5-08b2f8502abc	\N	\N	2026-10-11 05:40:03.195	\N	::1	curl/8.5.0	2026-09-11 05:40:03.197
972ef10c-b050-476a-b453-8355a3cc7ef1	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	ee977df5d1b6fe2c8be39eb1b6d3c53f71c14a8c05b67129eb27a92edff0879e	3db9ea5c-16ad-4c0d-a4e5-d52c6e68cc4f	\N	\N	2026-10-11 05:40:24.88	\N	::1	curl/8.5.0	2026-09-11 05:40:24.882
97cb6844-bede-440c-948b-4490b9b8abd9	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	c3b70db668f97e810b3fde0984d1f579dde74e61e248a49b98ef9e61e70c09a2	f842fb90-5a7a-487c-a494-5375c3fff8a1	\N	\N	2026-10-11 05:40:35.441	\N	::1	curl/8.5.0	2026-09-11 05:40:35.442
e0f9b589-7d5e-435c-ae2e-5a2f06c0bbf4	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	fa7ceac30a3682f111d1ce4a4e80d5b130f2056bcfb0d485aaaf3e964e77134d	f953e411-8037-4400-b94c-03cacebf8f71	\N	\N	2026-10-11 05:40:49.029	\N	::1	curl/8.5.0	2026-09-11 05:40:49.03
8cc4c5dd-9c2e-43f5-857e-101519d0a161	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	74a999457627e4b4756eb6a2d287e68206ebc17efdeed3d2e8bff7f333bde441	3e865de6-2924-4918-997f-afa13f406119	\N	\N	2026-10-11 05:41:03.339	\N	::1	curl/8.5.0	2026-09-11 05:41:03.34
b35b1aa4-a7e7-4773-8659-518381bdf598	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	27136ca44f8589a1dd91d1c8f748e41c25db22697f295fd26290c0075bfa9af9	3fad0e25-fd7f-4adf-9ddb-77c3d4010714	\N	\N	2026-10-11 05:41:31.47	\N	::1	curl/8.5.0	2026-09-11 05:41:31.472
f8e95e27-9c71-402f-8086-b5971d19879c	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	8260ae9519e7048cd71860e2ff2d443d69bbd12c87c18252c03fee42a647dd9f	0951aa2e-2e77-42b9-8b19-9e28b6cb7a0d	\N	\N	2026-10-11 05:41:45.6	\N	::1	curl/8.5.0	2026-09-11 05:41:45.601
efa886be-f8a3-4c3d-b296-d65b74d373ac	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	da02d95c6b1637aaa0dafd3e91af26f7d75ada015297516a55338eed8686477e	2077eba6-eaff-4101-838b-7c4a6f468ce2	\N	\N	2026-10-11 05:41:58.458	\N	::1	curl/8.5.0	2026-09-11 05:41:58.459
d5120965-b15b-47f2-9990-47657dbbb614	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	9c6bfa276452b0457bfa28de265637e88a70dca4c3baf87142a49223e2fbf401	ea80411f-0f84-4896-a048-c0c9e54412a0	\N	\N	2026-10-11 05:42:11.822	\N	::1	curl/8.5.0	2026-09-11 05:42:11.824
3c752c66-951d-48a5-ad13-6644bc9bf4af	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	2f1bb6c8b31fdbc8b0f3997de321e9ccfe38fb678fbab6bebd06b644a251a6cd	baf6128c-e5b7-40ff-858b-ec255d4188b2	\N	\N	2026-10-11 05:43:55.806	\N	::1	curl/8.5.0	2026-09-11 05:43:55.809
072cf411-e942-477a-9668-b968b582e277	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	79ac38968713b18245787a86ee5fc810dfa53acdf4c85f61a24100ec13d9fd98	35420364-dc97-4e30-abda-1983be043d68	\N	\N	2026-10-11 05:43:55.917	\N	::1	curl/8.5.0	2026-09-11 05:43:55.919
e36995e4-44d3-4856-93f1-16c33005270f	839f3441-a924-45aa-b78c-19f64b24ef1b	159233a3d517c49c3daeb534c2b0535c07886be63de1031c710bcc97a6c7eb35	5610adf0-c818-43b5-9d9e-558d45fc0be8	\N	\N	2026-10-11 05:43:56.287	\N	::1	curl/8.5.0	2026-09-11 05:43:56.289
59f5b2c3-6692-4d3e-9bfb-77d3df24e6dd	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	f0387b47d069d1b1dae1eee8ab7e8d9ee3ed7d816cdf49c80aea24165b265be5	d0db1332-cf06-4996-a2c3-d8c9636a0ddd	\N	\N	2026-10-11 05:49:03.867	\N	::1	curl/8.5.0	2026-09-11 05:49:03.869
0025f776-8b3f-4a6a-873f-73314b8ccad0	839f3441-a924-45aa-b78c-19f64b24ef1b	2ebecf26d7e4db8f2cc28f823310ec565aae42c8d77d312aee908baa6188aa66	fbd1d365-e207-4acd-ae32-e12d4b9d12e4	2026-09-11 05:51:55.559	4f2b34b7693ec08d7c7b11bc1e6b53339fa15ce2397410ef4b2d300376f7de53	2026-10-11 05:51:55.286	\N	::1	curl/8.5.0	2026-09-11 05:51:55.289
10c7f0e4-3438-4987-84ee-28dfcc27abbe	839f3441-a924-45aa-b78c-19f64b24ef1b	4f2b34b7693ec08d7c7b11bc1e6b53339fa15ce2397410ef4b2d300376f7de53	fbd1d365-e207-4acd-ae32-e12d4b9d12e4	2026-09-11 05:51:55.607	\N	2026-10-11 05:51:55.286	\N	::1	curl/8.5.0	2026-09-11 05:51:55.565
4ee4efbb-9cad-4eaa-ac0a-62823db27cf6	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	d760f118dd9de87c3d3087cdeb701c9e15851375fb380b0cb2f374beb7622ba5	f9661609-5c7a-4511-acc4-dd804cdd0c2f	\N	\N	2026-10-11 05:51:55.74	\N	::1	curl/8.5.0	2026-09-11 05:51:55.741
35f661c3-0602-42f4-8513-d6d782c7b888	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	4faa95c64e8cb6d85a8a0c05a7c2ccf5c86d8b144759960e0ac78002605618b7	af57c00c-baa5-440b-a752-c1a84f8f5a51	\N	\N	2026-10-11 05:51:55.834	\N	::1	curl/8.5.0	2026-09-11 05:51:55.835
efd56790-b875-449d-a31a-1509a4295b9f	839f3441-a924-45aa-b78c-19f64b24ef1b	405e8546b8e4924708f2b8b6abd1283d89dfb08916af1f6723a25e0255760d33	36a04b91-84e9-4408-b4ff-6ac1469dd08f	\N	\N	2026-10-11 05:51:56.69	\N	::1	curl/8.5.0	2026-09-11 05:51:56.691
8646f9df-57bc-4e32-95af-708c097b5187	839f3441-a924-45aa-b78c-19f64b24ef1b	f825a04567ba4b1f683ca6802b3c5d38157e93fbbc0007ad61a1495ad02732f7	b00d930a-c51b-4432-914b-fc7a147e36c4	2026-09-11 05:54:29.886	7f5b142bfabcb519c93ebadadcc7c4561bb3d0fddf3183468faeca33db09efe0	2026-10-11 05:54:28.535	\N	::1	curl/8.5.0	2026-09-11 05:54:28.537
48e7601a-2a34-4a05-8eb5-3ce4d18c3e56	839f3441-a924-45aa-b78c-19f64b24ef1b	7f5b142bfabcb519c93ebadadcc7c4561bb3d0fddf3183468faeca33db09efe0	b00d930a-c51b-4432-914b-fc7a147e36c4	2026-09-11 05:54:29.951	\N	2026-10-11 05:54:28.535	\N	::1	curl/8.5.0	2026-09-11 05:54:29.891
04c3c05c-abde-4ea2-a084-a2d3ee2d5f81	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	f2148b855e209e5f61f6f2662725aee793bcfebf574c6b4a72fb60faba99cae3	59f65f66-918c-4a65-96aa-6eddfe72a629	\N	\N	2026-10-11 05:54:30.116	\N	::1	curl/8.5.0	2026-09-11 05:54:30.117
a40742a0-e800-4e07-af1e-31ce9bc5d507	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	b1acc545bfdaa9c3126689efa373286d3d120b09b58cd76ab11fd80df6bc0925	1407fc9e-916c-4fd1-82a3-f1fef20f432f	\N	\N	2026-10-11 05:54:30.228	\N	::1	curl/8.5.0	2026-09-11 05:54:30.229
fd67a653-93ca-490e-88cf-0547987bb8b5	839f3441-a924-45aa-b78c-19f64b24ef1b	f24b66b9e4bd66fba4d3b4a7969b3dd986499b6964f61ed3221da27d8a6b83ce	a212be15-7f50-4082-bacd-814fa271c423	\N	\N	2026-10-11 05:54:31.076	\N	::1	curl/8.5.0	2026-09-11 05:54:31.078
f1f3348f-118c-48d7-8bbd-18104b3cdcde	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	16041af7c0338f10216d6f69ea9d01e68b3a9324af5e61269b419f5423876eaf	d93743b5-1224-4f5f-be46-ea7d00f86430	\N	\N	2026-10-11 05:54:40.92	\N	::1	curl/8.5.0	2026-09-11 05:54:40.922
51a83e0d-8385-4b9e-8d2c-f3730d86c9ae	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	659f66ce10eb0f344b4db84268be1efc423d819b01064465ad001540c301494b	149ef749-00fd-4751-824c-b8fe36d509b3	\N	\N	2026-10-11 06:10:04.439	\N	::1	curl/8.5.0	2026-09-11 06:10:04.442
e14f8f3a-2b79-46c2-af9e-96aebbe0b37c	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	c869bcb9e816c964d0e1766a110fb6c955c92ff6770bf9b3fe15cb17472b03f5	163cfd17-5205-488d-8bd1-0cfe4da25192	\N	\N	2026-10-11 06:10:05.293	\N	::1	curl/8.5.0	2026-09-11 06:10:05.296
752380e2-5fae-47f5-b40d-a494d2b95cb7	839f3441-a924-45aa-b78c-19f64b24ef1b	eb65543a3fb07d0c03bf13cb99732bd9d3581f090df036827f5ebd31c4e13482	30d88488-9758-4915-957b-3a3d80722e3d	2026-09-11 06:12:37.052	7a730ec0258a709cd57b478e67df3b65065adb66aa940796c30051e630772d2b	2026-10-11 06:10:25.884	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:10:25.886
e79704d9-c4b3-4c47-b849-eee40fa2ed42	839f3441-a924-45aa-b78c-19f64b24ef1b	920483ad35ceabde6bc917982e348ec9d22d160d22b952257323408741616e8d	f42ffbb4-1cb9-416f-b605-d459638d8fa9	\N	\N	2026-10-11 06:13:07.452	\N	::1	curl/8.5.0	2026-09-11 06:13:07.454
1da881ff-e919-43be-b050-50c08cfe2cb9	839f3441-a924-45aa-b78c-19f64b24ef1b	e6aadf819c98e0617e5cfd6217922351a2b582d035cdf4bf9038f649f5e663c8	626854ce-6cad-4448-bdc0-5ff56df92e92	2026-09-11 06:14:19.434	01e1de4da8b410cccb87918c92ea2b374f2568032a517e355dd095d384261340	2026-10-11 06:14:19.142	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:14:19.144
43e47f7e-555b-4485-8dfe-c5e8ea70fcbe	839f3441-a924-45aa-b78c-19f64b24ef1b	01e1de4da8b410cccb87918c92ea2b374f2568032a517e355dd095d384261340	626854ce-6cad-4448-bdc0-5ff56df92e92	2026-09-11 06:14:23.358	75d8727b6c7e5b38cf787d516e1b65f58c1c4c3db74f5586a3845dc690b3966b	2026-10-11 06:14:19.142	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:14:19.436
ee5167ed-865a-4528-8a58-4da1fb3733e9	839f3441-a924-45aa-b78c-19f64b24ef1b	75d8727b6c7e5b38cf787d516e1b65f58c1c4c3db74f5586a3845dc690b3966b	626854ce-6cad-4448-bdc0-5ff56df92e92	2026-09-11 06:14:46.812	25ab3be5f36c0be4557d9192e8ea53747b146f10634678107e1b65e65d10df2d	2026-10-11 06:14:19.142	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:14:23.361
c4b22685-719e-4610-89f3-5f6a700d2f32	839f3441-a924-45aa-b78c-19f64b24ef1b	25ab3be5f36c0be4557d9192e8ea53747b146f10634678107e1b65e65d10df2d	626854ce-6cad-4448-bdc0-5ff56df92e92	\N	\N	2026-10-11 06:14:19.142	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:14:46.814
78a5a8b0-815a-4bc9-8ac3-41e1d0ea8107	839f3441-a924-45aa-b78c-19f64b24ef1b	5af59b110a10da417b22d6b0643778ed5ca530eba7636b62aa12050ccc55768a	f9239b89-146c-425b-a936-f5a9a17878e4	2026-09-11 06:14:50.015	68d9202a2a38deb3f5cbfb904da27663dafd8ae1c39dd42813c4aae4a8f1deb4	2026-10-11 06:14:49.739	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:14:49.74
3720338f-1ca4-40ab-a6f1-b12333fc62be	839f3441-a924-45aa-b78c-19f64b24ef1b	68d9202a2a38deb3f5cbfb904da27663dafd8ae1c39dd42813c4aae4a8f1deb4	f9239b89-146c-425b-a936-f5a9a17878e4	2026-09-11 06:15:16.933	7ac8e98588450509aa4fc2500f700134b401d83a549e1970e66059581599f179	2026-10-11 06:14:49.739	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:14:50.018
a5bc3bbd-236b-45eb-87b1-a965d867458c	839f3441-a924-45aa-b78c-19f64b24ef1b	7ac8e98588450509aa4fc2500f700134b401d83a549e1970e66059581599f179	f9239b89-146c-425b-a936-f5a9a17878e4	2026-09-11 06:15:46.58	de73a43f97654d92ce96edee8645309e4596bda1b7c2eda42725feca60ac99d6	2026-10-11 06:14:49.739	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:15:16.935
e176d10c-9a0f-4c02-b4cd-236da0d061f3	839f3441-a924-45aa-b78c-19f64b24ef1b	de73a43f97654d92ce96edee8645309e4596bda1b7c2eda42725feca60ac99d6	f9239b89-146c-425b-a936-f5a9a17878e4	\N	\N	2026-10-11 06:14:49.739	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:15:46.584
89e15a3f-d735-48ce-8384-4024002cec87	839f3441-a924-45aa-b78c-19f64b24ef1b	ba3e92719dcdcc8e62477ba9a0e8cd152b838b0bde6668e7473901ebc4cdf7e1	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:15:48.205	b7cd5f9deea0739d528db266ed7657b4cb7980d476c99f9c94d916cf665fe233	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:15:48.051
74b41c32-3f67-46db-acd1-0c8a8382a2a1	839f3441-a924-45aa-b78c-19f64b24ef1b	b7cd5f9deea0739d528db266ed7657b4cb7980d476c99f9c94d916cf665fe233	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:15:52.618	330c834d3f2f2ac2f430ada61aafe17ec47d9075ad1b266ef602714fdbc2c130	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:15:48.207
3ddb2867-0a80-4d41-9a8f-976c863670e7	839f3441-a924-45aa-b78c-19f64b24ef1b	330c834d3f2f2ac2f430ada61aafe17ec47d9075ad1b266ef602714fdbc2c130	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:16:24.389	3c1a11616d7df2c3d7e97e05d6c315c061a06a4aa19090ce63497106328a55e6	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:15:52.62
a16448fb-917a-4d70-9f33-7e6273532b3c	839f3441-a924-45aa-b78c-19f64b24ef1b	3c1a11616d7df2c3d7e97e05d6c315c061a06a4aa19090ce63497106328a55e6	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:16:49.824	259aeec2d13c387edb624bcde29daf803e3acad4301f225c566f85da8bb0d72e	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:16:24.391
09ab9a19-be58-4851-9ad7-7839baa407ef	839f3441-a924-45aa-b78c-19f64b24ef1b	259aeec2d13c387edb624bcde29daf803e3acad4301f225c566f85da8bb0d72e	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:17:03.452	4382d526870f19a11ab7fd68c3bc765d3b6cc348502c2560930625352a33312e	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:16:49.827
f3e0e3c5-49f4-498a-a6a7-038f2aed0d5a	839f3441-a924-45aa-b78c-19f64b24ef1b	4382d526870f19a11ab7fd68c3bc765d3b6cc348502c2560930625352a33312e	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:17:41.062	adb3d468acb9dc5c11aad49a25cd1007b0ffe6a69491e331400bb572f3cc4243	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:17:03.454
b7c3a450-7ce7-4846-9740-3a467e7efb4a	839f3441-a924-45aa-b78c-19f64b24ef1b	adb3d468acb9dc5c11aad49a25cd1007b0ffe6a69491e331400bb572f3cc4243	c3190452-9423-4a0f-83e7-6d3a576c5523	2026-09-11 06:18:15.3	852086027d718a76ebc31ae4599ee04ff82c132ae63d65ac7264159fac623042	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:17:41.064
c802db63-68c0-4676-9837-6132035b81b9	839f3441-a924-45aa-b78c-19f64b24ef1b	852086027d718a76ebc31ae4599ee04ff82c132ae63d65ac7264159fac623042	c3190452-9423-4a0f-83e7-6d3a576c5523	\N	\N	2026-10-11 06:15:48.05	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:18:15.301
792565d2-25b4-40e5-82b8-b86bb0f2db14	839f3441-a924-45aa-b78c-19f64b24ef1b	e6ccd6585c1a51718cfc577f80cdcdbe0dd1c15e5f5cf6b1e551cce901bac9b1	29ec2e82-fcce-44c0-a929-a3cb83c170ad	2026-09-11 06:25:48.382	0485b0d1dc850453c5378065202653b29aef46e58c5a1ed790e2c1f5b3b1d0b3	2026-10-11 06:25:47.107	\N	::1	curl/8.5.0	2026-09-11 06:25:47.109
db5620f6-388a-411a-9a01-d9936323de24	839f3441-a924-45aa-b78c-19f64b24ef1b	0485b0d1dc850453c5378065202653b29aef46e58c5a1ed790e2c1f5b3b1d0b3	29ec2e82-fcce-44c0-a929-a3cb83c170ad	2026-09-11 06:25:48.417	\N	2026-10-11 06:25:47.107	\N	::1	curl/8.5.0	2026-09-11 06:25:48.384
84799865-fc1a-45e4-8a78-e5e7dc125eaa	839f3441-a924-45aa-b78c-19f64b24ef1b	7a730ec0258a709cd57b478e67df3b65065adb66aa940796c30051e630772d2b	30d88488-9758-4915-957b-3a3d80722e3d	2026-09-11 06:28:23.278	b1fd0e193942e6d3eaa889b10676581451e1355823a9a5c57ed0de5a92d1a767	2026-10-11 06:10:25.884	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:12:37.06
c1be8fb5-be66-4646-8cca-34f466544c55	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	e8e961b168b15f25b66cd5068cddf3f8fba4a55a1e17c363462e1af8e7a0fbba	6e4aa230-e2cc-41f2-a2e4-ed7bba2b9ec8	\N	\N	2026-10-11 07:14:45.938	\N	::1	curl/8.5.0	2026-09-11 07:14:45.94
48fa3961-2605-4997-8036-fc63d42d030e	839f3441-a924-45aa-b78c-19f64b24ef1b	4dbfdf40eb43cd98bb5806dfb02a5d377b8fcfb001a29302732f286fbc26b885	044a88f9-18f9-4db0-bf48-1704b8440550	2026-09-11 06:26:02.824	b636f74ab3e8a9f76d58da3d3ac1da32d43bf340def37118ca79d07c3d771ee9	2026-10-11 06:26:01.574	\N	::1	curl/8.5.0	2026-09-11 06:26:01.575
0cb95594-64ba-47c7-99d9-548fbd761b80	839f3441-a924-45aa-b78c-19f64b24ef1b	b636f74ab3e8a9f76d58da3d3ac1da32d43bf340def37118ca79d07c3d771ee9	044a88f9-18f9-4db0-bf48-1704b8440550	2026-09-11 06:26:02.854	\N	2026-10-11 06:26:01.574	\N	::1	curl/8.5.0	2026-09-11 06:26:02.825
b8c3b34f-e114-4558-bd87-24a7e32ac994	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	326a01c05bf17a2531007fb96e15acf08c835ffe54181d9f7284eeea5b665095	3bf682f6-f86c-469f-b210-22c97412e01f	\N	\N	2026-10-11 06:26:03.621	\N	::1	curl/8.5.0	2026-09-11 06:26:03.622
36cdbb4d-0fb6-416b-8658-e873c46312f9	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	2c4b36849c48aa5e1bef4355a052962aa9e71442123fca4651c44502596524e6	65a58278-73f9-49bc-a963-efd593857cff	\N	\N	2026-10-11 06:26:04.882	\N	::1	curl/8.5.0	2026-09-11 06:26:04.883
5200cbff-dea9-4b6b-831a-3615ac9f5a23	839f3441-a924-45aa-b78c-19f64b24ef1b	b910337947ac887decbc7f96c21c05a8c2d1e16b3d9892f0202cfc94ea5d1ef9	d5145351-c29f-4924-96bc-6507bca5c9f6	\N	\N	2026-10-11 06:26:06.632	\N	::1	curl/8.5.0	2026-09-11 06:26:06.634
e4058468-cca5-4793-905d-7a4e4ffabc01	839f3441-a924-45aa-b78c-19f64b24ef1b	510d5b5b0b52bf3a8977da5629f397f230937b690acda12d8267110b6771df18	495f306c-c3ad-47a5-8970-1080c8419e3f	2026-09-11 06:30:58.949	4a99029620f0542782752bc6c9db3d691cddd892a56a60e8e6ce3cb82b84dc4c	2026-10-11 06:18:37.952	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:18:37.953
9ab426df-d153-49ba-83e0-5b9d1b64fb7a	839f3441-a924-45aa-b78c-19f64b24ef1b	4a99029620f0542782752bc6c9db3d691cddd892a56a60e8e6ce3cb82b84dc4c	495f306c-c3ad-47a5-8970-1080c8419e3f	2026-09-11 06:32:03.861	f2af5e78c681efcfa0b109a0b0f7143753533f32d015a1a1c7761c087f147b13	2026-10-11 06:18:37.952	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:30:58.95
870fd1fe-4eb7-4b8f-bcd7-724f00445a04	839f3441-a924-45aa-b78c-19f64b24ef1b	f2af5e78c681efcfa0b109a0b0f7143753533f32d015a1a1c7761c087f147b13	495f306c-c3ad-47a5-8970-1080c8419e3f	2026-09-11 06:32:06.936	cd81aab543d3ea9383e5ab5bcd5bd9e100fbfbff387d624aaa9489bfa7d309ad	2026-10-11 06:18:37.952	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:32:03.863
fea8771c-2037-48a6-8162-56c83fcf342a	839f3441-a924-45aa-b78c-19f64b24ef1b	cd81aab543d3ea9383e5ab5bcd5bd9e100fbfbff387d624aaa9489bfa7d309ad	495f306c-c3ad-47a5-8970-1080c8419e3f	2026-09-11 06:32:13.941	3b58e055018d13c6f7c0dd0a751b7ecf081639746c7d36d4f7b5b9ad2b57928f	2026-10-11 06:18:37.952	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:32:06.938
4bade127-1a30-4862-9207-46a2b7f9b17a	839f3441-a924-45aa-b78c-19f64b24ef1b	3b58e055018d13c6f7c0dd0a751b7ecf081639746c7d36d4f7b5b9ad2b57928f	495f306c-c3ad-47a5-8970-1080c8419e3f	\N	\N	2026-10-11 06:18:37.952	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-11 06:32:13.943
7b483cd6-d89a-4aa8-9b61-4e16bed37b6f	839f3441-a924-45aa-b78c-19f64b24ef1b	b1fd0e193942e6d3eaa889b10676581451e1355823a9a5c57ed0de5a92d1a767	30d88488-9758-4915-957b-3a3d80722e3d	2026-09-11 06:33:37.012	c3ca316f49efde084c882d06b6c773afd56b89860331168c8930b791b2ff9432	2026-10-11 06:10:25.884	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:28:23.28
07f0dbc4-e2b5-40a3-a853-5b630782ae6e	839f3441-a924-45aa-b78c-19f64b24ef1b	c3ca316f49efde084c882d06b6c773afd56b89860331168c8930b791b2ff9432	30d88488-9758-4915-957b-3a3d80722e3d	2026-09-11 06:42:30.664	cc2cd5914e61e85fa82f266fb51517426155e5a3a0d53a681cf3937ae809a869	2026-10-11 06:10:25.884	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:33:37.014
e4f9137f-4852-43ce-b763-492e667de0ce	839f3441-a924-45aa-b78c-19f64b24ef1b	cc2cd5914e61e85fa82f266fb51517426155e5a3a0d53a681cf3937ae809a869	30d88488-9758-4915-957b-3a3d80722e3d	2026-09-11 06:42:31.896	47409a6cca9a80022de8555ba955d03da98dfca77281f61314b009fbaab8cb71	2026-10-11 06:10:25.884	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:42:30.668
a08a0af8-9209-43b1-bf6d-83a85be8e154	839f3441-a924-45aa-b78c-19f64b24ef1b	47409a6cca9a80022de8555ba955d03da98dfca77281f61314b009fbaab8cb71	30d88488-9758-4915-957b-3a3d80722e3d	2026-09-11 06:42:38.424	\N	2026-10-11 06:10:25.884	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:42:31.898
c3039831-f6bd-48d0-b7af-0214b6c052c3	8250825b-8ed2-4879-bc56-25d409f3cbe8	03cfcd8223db40dfb3936db282b397b76a18e31bbd3d8b9cd5b08d7197b8b273	aa0e806d-d1ab-4c0c-84a3-adff705c14d9	2026-09-11 06:42:47.157	\N	2026-10-11 06:42:43.283	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:42:43.284
379d406a-bff9-49e8-8820-3024f2e4b1b7	622f2284-d2c5-4f14-9ce6-9ac55c98cf23	0e812af032397b3b61a54068e84a9d6c93b8fca868189713c18b3b7574c967be	c2c4d5b8-829a-4757-bd88-355e627d610d	2026-09-11 06:42:54.895	\N	2026-10-11 06:42:52.451	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:42:52.454
45d49b77-9cf3-4840-b14f-7730fa4072da	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	23b1a692bf4a572c8f35dc0f5c25b90ec23130b6ae4de13cbdeffb27702cb89f	66e652ec-bde7-4641-8f99-dfe2a8e78a94	\N	\N	2026-10-11 06:51:39.756	\N	::1	curl/8.5.0	2026-09-11 06:51:39.758
fe81cbaf-dc0a-45c7-a44c-7ba99dca900b	839f3441-a924-45aa-b78c-19f64b24ef1b	7f55d0acafa0944c93a77a11a0203f144e982ffba13268ebb5ead7014fc55d58	6efdb0b2-41e7-4a21-a887-8dd4966b6cb1	2026-09-11 06:54:04.895	0b8e2eeddf2992beafa28a25a745246ca62dd739c921292f56f736e66f013c4e	2026-10-11 06:43:03.438	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:43:03.44
d247c31f-a0ae-421c-8192-b1a1c5038efa	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	6306bbea520e6b85bf48969b0158d2d64c28735b85ff8ae40c730d52b6b1b8f3	110f99b3-d9c0-4e9c-b53b-e6c6a2c02266	\N	\N	2026-10-11 06:54:52.582	\N	::1	curl/8.5.0	2026-09-11 06:54:52.585
d0cb78be-1175-46e7-a007-bbe75e761896	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	bae454dd8ce518212247309c8d55c571305c6029b4eae3ac3aff155b812179ad	528ba1d1-836f-4e93-8cd2-848f102c9ad5	\N	\N	2026-10-11 06:55:47.507	\N	::1	curl/8.5.0	2026-09-11 06:55:47.508
8d3601a1-fac5-44d3-b784-e36286e5ec5f	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	e3cb999da59c6b190e9e8d39a60d3ef8059cb3db0ca3e018860db2c0be72dd20	530bd29d-733a-4eec-a20c-0906e03188db	\N	\N	2026-10-11 06:59:12.349	\N	::1	curl/8.5.0	2026-09-11 06:59:12.352
03fbffac-8c20-43f7-a9ef-4c2f65532dae	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	31f7fac75a8c5946d6f44cbded337623160deab1be26da3b04673b7b7a332726	71d32792-9c44-4832-a81f-259468163198	\N	\N	2026-10-11 06:59:44.707	\N	::1	curl/8.5.0	2026-09-11 06:59:44.709
a4aa930a-bc2a-4cdd-bfeb-61765c31326d	839f3441-a924-45aa-b78c-19f64b24ef1b	0b8e2eeddf2992beafa28a25a745246ca62dd739c921292f56f736e66f013c4e	6efdb0b2-41e7-4a21-a887-8dd4966b6cb1	2026-09-11 07:10:14.044	143dc0caaac020e39b97b7cfd6a586892afb710d92ab623a4090ba64da51a595	2026-10-11 06:43:03.438	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 06:54:04.898
abe53399-0c3d-44fb-9011-db80e4252433	839f3441-a924-45aa-b78c-19f64b24ef1b	5a7f0a05548a406c8efd96088d940cd1521f37cc22bb5a73f562d8ff024869f8	8d3b5a2e-3531-433a-8c2a-9ce06974e2f4	2026-09-11 07:14:32.729	d17b2c15fc809893d7e06febf9941f08eb7309035d9cd1ed87736ae72e4b237e	2026-10-11 07:14:31.203	\N	::1	curl/8.5.0	2026-09-11 07:14:31.207
503c3e89-d767-4d08-bd26-12d071977eae	839f3441-a924-45aa-b78c-19f64b24ef1b	d17b2c15fc809893d7e06febf9941f08eb7309035d9cd1ed87736ae72e4b237e	8d3b5a2e-3531-433a-8c2a-9ce06974e2f4	2026-09-11 07:14:32.801	\N	2026-10-11 07:14:31.203	\N	::1	curl/8.5.0	2026-09-11 07:14:32.735
d81472e8-b9d4-4c41-afcf-563abccd83ae	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	f8b766928ce21bd70eeeea1d4c6096a419f4b40862ee9e25dd5c39c5a3ccf673	3a04da35-d851-4ca6-b5af-9203b7367af4	\N	\N	2026-10-11 07:14:33.408	\N	::1	curl/8.5.0	2026-09-11 07:14:33.411
55013be7-5245-45c8-90b1-1fa1ecd23e08	7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	938f23177aba7efeb04e9f4591fd46a22bf79a1fbca05758364fea71ad52ab68	b22e1ccf-9554-4a1a-ae45-683ff19ac497	\N	\N	2026-10-11 07:14:34.225	\N	::1	curl/8.5.0	2026-09-11 07:14:34.227
c6cfd1e0-a32c-4478-9d8c-20d72ae1104f	839f3441-a924-45aa-b78c-19f64b24ef1b	87bb6a39331fa0787061eafb05e6767944c139d9f84fc9ebe7e7bfbded4fc774	1cc5c7b7-d316-4a13-9ed4-178591ef5390	\N	\N	2026-10-11 07:14:35.434	\N	::1	curl/8.5.0	2026-09-11 07:14:35.436
3f2a076d-3a3f-40f1-a5c2-425e7cb39c99	839f3441-a924-45aa-b78c-19f64b24ef1b	143dc0caaac020e39b97b7cfd6a586892afb710d92ab623a4090ba64da51a595	6efdb0b2-41e7-4a21-a887-8dd4966b6cb1	2026-09-11 07:16:31.94	\N	2026-10-11 06:43:03.438	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 07:10:14.05
625ed50c-3abc-40de-8989-b53c155eaa63	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	e89042791bfde29aca5d00c6d46b6466f474b9d55c89b2765d0df2c6e1cf6d63	37737b10-7e7d-480e-813f-c634117e08d4	\N	\N	2026-10-11 07:14:48.278	\N	::1	curl/8.5.0	2026-09-11 07:14:48.28
15c54eb3-e31f-4051-98f4-b1c3a329cb6c	839f3441-a924-45aa-b78c-19f64b24ef1b	048bf44bac6a6ab743188e0a8cbd7757e97c7c05fe342489070d3a8cc67f1375	d19a5563-2520-4b47-879b-ad942e459cc2	2026-09-11 09:07:04.967	945ed130d286021ead9a5d6a10f186a5a5b18b800c5297e860c7b2493c7b318b	2026-10-11 08:51:14.508	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 08:51:14.51
dbc9fdde-fada-4ab2-bc08-daddd813af3b	839f3441-a924-45aa-b78c-19f64b24ef1b	945ed130d286021ead9a5d6a10f186a5a5b18b800c5297e860c7b2493c7b318b	d19a5563-2520-4b47-879b-ad942e459cc2	2026-09-11 09:22:27.874	bd2cffbd9c780fef84af5ec18f4b21d05f48ae2bfeecf928911d1c58fea8804b	2026-10-11 08:51:14.508	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 09:07:04.969
16a8ac88-8b11-4e17-b318-9d2cacc119ed	839f3441-a924-45aa-b78c-19f64b24ef1b	bd2cffbd9c780fef84af5ec18f4b21d05f48ae2bfeecf928911d1c58fea8804b	d19a5563-2520-4b47-879b-ad942e459cc2	2026-09-11 09:38:14.099	9e9898cd0ec3b3fbd0e78703383577285dc0b6a086f9359d858541d3ca9a179f	2026-10-11 08:51:14.508	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 09:22:27.876
00c0d8d8-ace6-4cd2-9900-51b5cb7a2866	839f3441-a924-45aa-b78c-19f64b24ef1b	9e9898cd0ec3b3fbd0e78703383577285dc0b6a086f9359d858541d3ca9a179f	d19a5563-2520-4b47-879b-ad942e459cc2	2026-09-11 09:54:13.979	67c6f640bc20f230cd78b640122c0dce346c21f3be599b4c6f1bb5dda34af609	2026-10-11 08:51:14.508	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 09:38:14.102
267f1585-2e87-47e2-830b-9564ccb7e716	839f3441-a924-45aa-b78c-19f64b24ef1b	67c6f640bc20f230cd78b640122c0dce346c21f3be599b4c6f1bb5dda34af609	d19a5563-2520-4b47-879b-ad942e459cc2	2026-09-11 10:10:14.018	bf40e108950f6a8af2a2a0f0ad8ad28e84a66530809815d9908a7f1b99510e83	2026-10-11 08:51:14.508	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 09:54:13.982
ff8bd009-00f0-4342-8e68-85c1c08abd05	839f3441-a924-45aa-b78c-19f64b24ef1b	bf40e108950f6a8af2a2a0f0ad8ad28e84a66530809815d9908a7f1b99510e83	d19a5563-2520-4b47-879b-ad942e459cc2	2026-09-11 10:10:29.985	\N	2026-10-11 08:51:14.508	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	2026-09-11 10:10:14.021
00c23549-1919-4c60-8568-a85510660ad8	839f3441-a924-45aa-b78c-19f64b24ef1b	b5c38db2b23efee7f213fb678ec984ec95374d04614ccff5c7ff31648c8eb242	38f2ecfc-f185-4234-8806-0fffc130f4a8	2026-09-17 09:30:18.585	279ead22f8847d88738190f64599f55aee44d6cd50499d12ca393b7cc4b755d6	2026-10-17 09:15:18.206	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 09:15:18.207
353292c1-884b-43cc-b7cb-582e157170cf	839f3441-a924-45aa-b78c-19f64b24ef1b	279ead22f8847d88738190f64599f55aee44d6cd50499d12ca393b7cc4b755d6	38f2ecfc-f185-4234-8806-0fffc130f4a8	2026-09-17 09:46:00.118	a2288d23ff01a80b848e1de89f126131336383ce88c531008c53c25ec0ce3184	2026-10-17 09:15:18.206	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 09:30:18.587
a0dcf6f3-5dea-4113-925d-c9962df96c8b	839f3441-a924-45aa-b78c-19f64b24ef1b	a2288d23ff01a80b848e1de89f126131336383ce88c531008c53c25ec0ce3184	38f2ecfc-f185-4234-8806-0fffc130f4a8	2026-09-17 10:01:00.115	06c42d617f7c809b58c54aa9558bfad58bf6aa979790791d066a199f7dbd22b4	2026-10-17 09:15:18.206	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 09:46:00.119
b7aee1f4-d82f-45f6-ab95-1259456bbd55	839f3441-a924-45aa-b78c-19f64b24ef1b	06c42d617f7c809b58c54aa9558bfad58bf6aa979790791d066a199f7dbd22b4	38f2ecfc-f185-4234-8806-0fffc130f4a8	2026-09-17 10:04:51.585	\N	2026-10-17 09:15:18.206	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 10:01:00.116
cd1eec9b-6261-46fe-85a4-21ff2ba903dc	839f3441-a924-45aa-b78c-19f64b24ef1b	48147c7d3ac7a5beed069e102f322380f253c64822dd88db861161a197b40ce5	fa5e999e-1cbd-45c9-bbe5-2fad9a81a39a	2026-09-17 10:10:40.817	\N	2026-10-17 10:10:30.194	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 10:10:30.195
11a3e39d-281c-41dd-8299-bdfcd7a14625	839f3441-a924-45aa-b78c-19f64b24ef1b	ec441f44538c07fbee04cb22ed9b242e7f7019c545e3ef64675e09e2c98a3d58	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:27:52.767	f102f4e98fede7d93624b32ff8b42d746621c43bf6ede604c8eac1f602d0da76	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:26:47.574
153a9449-a66f-4eb6-8336-b98a1d417b90	839f3441-a924-45aa-b78c-19f64b24ef1b	f102f4e98fede7d93624b32ff8b42d746621c43bf6ede604c8eac1f602d0da76	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:28:27.614	bf5d3f34a14b3b14653bd5d097546913cea899576891c641030fb58ce05cf05c	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:27:52.769
ad01574a-eeb2-4658-b0d4-0de9bf3ca617	839f3441-a924-45aa-b78c-19f64b24ef1b	bf5d3f34a14b3b14653bd5d097546913cea899576891c641030fb58ce05cf05c	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:28:42.193	c1a97524e199d310744b014dc9f9fdcc9463ac2d76e9c0100f7a93253a06d843	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:28:27.614
008a3414-ea9a-4bc4-ae9f-0d9ef41480fd	839f3441-a924-45aa-b78c-19f64b24ef1b	c1a97524e199d310744b014dc9f9fdcc9463ac2d76e9c0100f7a93253a06d843	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:28:54.645	781ac3136d023abacce10e93e824e5d883f97ecd467788454eb9eaa09b746baa	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:28:42.194
8dc90e54-f82e-4b2d-82eb-f207ab1d44bb	839f3441-a924-45aa-b78c-19f64b24ef1b	781ac3136d023abacce10e93e824e5d883f97ecd467788454eb9eaa09b746baa	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:32:24.249	5a6e455249b0df7ebc55b3efd7223cf43f68c93ca8f8bd160c77e5a60509e558	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:28:54.646
9f143986-69a3-4857-8758-ff839a085d49	839f3441-a924-45aa-b78c-19f64b24ef1b	5a6e455249b0df7ebc55b3efd7223cf43f68c93ca8f8bd160c77e5a60509e558	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:32:30.76	67152b0fc0677db95f4a80dfa43c6f4fc4eb5887fb22e2ccfd49316ea3899f74	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:32:24.251
ad41aaea-8fe0-4ec0-bfb5-a8a054e5e88c	839f3441-a924-45aa-b78c-19f64b24ef1b	67152b0fc0677db95f4a80dfa43c6f4fc4eb5887fb22e2ccfd49316ea3899f74	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:32:57.746	7c17d155c5b723dbc976c89a7e80852113c9390dde61e74e8ecd1e70ffb83bea	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:32:30.761
45eb04db-c1ed-4feb-b34f-0191c1b29a64	839f3441-a924-45aa-b78c-19f64b24ef1b	7c17d155c5b723dbc976c89a7e80852113c9390dde61e74e8ecd1e70ffb83bea	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:00.761	3415fa715a9c1a9997e40dd8acd453eac324c7e0a62f4e956661e45ffabbb92a	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:32:57.747
3bad9f27-e601-4115-ab06-bb8e13a99f00	839f3441-a924-45aa-b78c-19f64b24ef1b	3415fa715a9c1a9997e40dd8acd453eac324c7e0a62f4e956661e45ffabbb92a	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:03.782	448ee0d8ad5b5e49c50f2d29351a4ad276573a196d87109303837bcca502909e	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:00.762
054e8915-ca4e-4bb6-90cc-05e26e3157e7	839f3441-a924-45aa-b78c-19f64b24ef1b	c4ff602b9ece62247581fb34e68ee6c265a17968e91a54894f1e991257ca0066	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 10:37:37.007	89bc760c73367bd973e9f4f73dd8ee0107df67de52ece0eaec33d1572ee49244	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 10:24:03.945
05c6b6e8-c62c-4dbd-b769-6e5245d6646b	839f3441-a924-45aa-b78c-19f64b24ef1b	448ee0d8ad5b5e49c50f2d29351a4ad276573a196d87109303837bcca502909e	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:06.8	abdbe326ef41bbd951e38a23627adc40e7676bb33179e6b8be9426fbd55d78b2	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:03.783
073b2ed9-0af0-48cb-a094-7188652f2d04	839f3441-a924-45aa-b78c-19f64b24ef1b	abdbe326ef41bbd951e38a23627adc40e7676bb33179e6b8be9426fbd55d78b2	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:09.832	0a6e8e3f80d7df7c4ca9d862be0dfc0e1a8d1f942046fab8cfe2a054bd6dd1a4	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:06.801
3fca1289-096c-4f8e-b349-1a4e17d6336e	839f3441-a924-45aa-b78c-19f64b24ef1b	0a6e8e3f80d7df7c4ca9d862be0dfc0e1a8d1f942046fab8cfe2a054bd6dd1a4	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:12.844	ffff44edae930fb769e13a283a81649c77b228ab3596f8a4dd09d013dc480c2e	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:09.833
b05e0996-4f70-4344-9c9f-2ade28990403	839f3441-a924-45aa-b78c-19f64b24ef1b	ffff44edae930fb769e13a283a81649c77b228ab3596f8a4dd09d013dc480c2e	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:15.874	37c2d1a64f871708cbad496488432bd0ab3cf8ee548c6bef22d47f9875daf9e7	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:12.845
466a74b4-7c7d-49da-9bcc-d9d534011e61	839f3441-a924-45aa-b78c-19f64b24ef1b	37c2d1a64f871708cbad496488432bd0ab3cf8ee548c6bef22d47f9875daf9e7	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:33:18.885	c2e57c7a5be48f3bc3a712dd26fc892e510b966f19c8e11eb693d522e56fad13	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:15.876
19349780-a069-4720-876b-6589768b3605	839f3441-a924-45aa-b78c-19f64b24ef1b	c2e57c7a5be48f3bc3a712dd26fc892e510b966f19c8e11eb693d522e56fad13	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:36:58.439	ec0ad88746ec22a8efb20fc01732fabca78f5ce5a92fecfe6c85cbc563f0f6fe	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:33:18.886
a688a8c0-3413-43bd-8448-a450f0a34b05	839f3441-a924-45aa-b78c-19f64b24ef1b	ec0ad88746ec22a8efb20fc01732fabca78f5ce5a92fecfe6c85cbc563f0f6fe	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:37:01.398	cee880a963649dbe3a58b2b3c42787b3fcb483ca804644e94205e7625e05bbec	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:36:58.441
74ea6bc1-7232-4110-bd4e-5e026252758c	839f3441-a924-45aa-b78c-19f64b24ef1b	cee880a963649dbe3a58b2b3c42787b3fcb483ca804644e94205e7625e05bbec	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:37:19.288	b6d6a428fd731dc56ffd080fa94bfae5d2e256bba201519a019086bc4584308f	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:37:01.399
55f49879-1bed-4505-8ef7-a7d96fdab3c3	839f3441-a924-45aa-b78c-19f64b24ef1b	b6d6a428fd731dc56ffd080fa94bfae5d2e256bba201519a019086bc4584308f	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:37:23.484	e263e865e236c4eb8a0899054d77e88ff2fe202b325f87ec8fb1e25f188f4cc7	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:37:19.289
4125d4f7-8775-4949-893d-e7d45a927b39	839f3441-a924-45aa-b78c-19f64b24ef1b	e263e865e236c4eb8a0899054d77e88ff2fe202b325f87ec8fb1e25f188f4cc7	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:37:58.911	9e3dc665acdda07e43f3d7d5f38ac88ee4b344e5e0ced69a90cbe5e0fdb03204	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:37:23.486
a91438bd-4333-47c7-a56f-6c1f16089fa0	839f3441-a924-45aa-b78c-19f64b24ef1b	9e3dc665acdda07e43f3d7d5f38ac88ee4b344e5e0ced69a90cbe5e0fdb03204	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:38:04.409	89d0c52a9bbbb6f741f1a04412cf03524b73d115ff0d6f89dcb6f11cffa6a69e	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:37:58.912
bd8ecac2-951a-4909-bbc9-d7521d3f4073	839f3441-a924-45aa-b78c-19f64b24ef1b	89d0c52a9bbbb6f741f1a04412cf03524b73d115ff0d6f89dcb6f11cffa6a69e	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:41:20.234	7eb153ddcd18324de7540cf18b00542afbd831d4a2ac9f06f87e447fa98c8212	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:38:04.41
ef6731a6-5612-4f71-8e51-6969b0e42df3	839f3441-a924-45aa-b78c-19f64b24ef1b	7eb153ddcd18324de7540cf18b00542afbd831d4a2ac9f06f87e447fa98c8212	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 10:41:24.928	7560da9c35e965657c7bed54174f4037c835fb812406e0bb7c5ddf955454f135	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:41:20.236
227fbb67-8f48-42a9-9080-c5a4a5b6a9fd	839f3441-a924-45aa-b78c-19f64b24ef1b	89bc760c73367bd973e9f4f73dd8ee0107df67de52ece0eaec33d1572ee49244	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 10:43:11.519	52651cf7d5254325c8a1d9cd75a11fdd9bd03d301cc5d3312639367ecf3acee1	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 10:37:37.008
20719b7b-f516-4ac8-8e9c-b97c042ee0fa	839f3441-a924-45aa-b78c-19f64b24ef1b	9bce0986343e1906f1f83bca700c9686d5eab368ac2726b63d14db5dd11fecdc	20f82467-11ec-44dc-8c34-54aec1d7d612	\N	\N	2026-10-17 10:59:06.202	\N	::1	curl/8.5.0	2026-09-17 10:59:06.204
70920f56-c1f7-44cc-9898-a85274f96b3a	839f3441-a924-45aa-b78c-19f64b24ef1b	12abda89e8f6b8ce438ae9366d01826d37e57024f1885227e6aaa0342837a635	8ae8dce1-ab50-42be-8561-4313642aae6f	\N	\N	2026-10-17 10:59:06.441	\N	::1	curl/8.5.0	2026-09-17 10:59:06.442
c7fe1b6e-8fa2-4d60-ba75-fa17924ad382	839f3441-a924-45aa-b78c-19f64b24ef1b	0857ede5d683d037337fc8d5fd0213ac2bdc5278454a054a35adaf01d7cef1b8	37ae4252-7090-4ad7-aa68-5bfc0561668e	\N	\N	2026-10-17 10:59:06.741	\N	::1	curl/8.5.0	2026-09-17 10:59:06.743
a44f5ca7-18c2-45ad-9679-0a2dad665b0d	839f3441-a924-45aa-b78c-19f64b24ef1b	4c331dc5e1172e7186a98b27ac29edb6934fc84c8313ffa2b80c49596797952c	3b3ea641-8949-49f3-a960-bddc743e646f	\N	\N	2026-10-17 10:59:07.011	\N	::1	curl/8.5.0	2026-09-17 10:59:07.013
4ca4ddd9-02cd-4b4b-a91f-8bb7379ad588	839f3441-a924-45aa-b78c-19f64b24ef1b	8989b53d97aa95909f2a7232333b4fe416b799c3532d14d97516a481dc80b2d6	eca168a2-db46-429e-bb2e-17bef608f701	\N	\N	2026-10-17 10:59:07.198	\N	::1	curl/8.5.0	2026-09-17 10:59:07.2
2b485153-dfb9-4f8a-8629-a144a81a3862	839f3441-a924-45aa-b78c-19f64b24ef1b	bae83a9fdc883d2e427ea7c686a4d50ae690e22133210e2a9dc7247964bee2ba	0375b133-5d08-49d5-a2d2-c5200b790a69	\N	\N	2026-10-17 10:59:07.375	\N	::1	curl/8.5.0	2026-09-17 10:59:07.376
fde6f9c7-7741-474f-9328-ce8f5a0f22b2	839f3441-a924-45aa-b78c-19f64b24ef1b	999e1c0f4e479e6e1e7c70b2427b3d0090184da4d37634050b664438b2e0fe9a	70a9e798-2467-4151-b7ff-5a7cfc23365a	\N	\N	2026-10-17 10:59:07.681	\N	::1	curl/8.5.0	2026-09-17 10:59:07.682
6618b11e-7ee6-42f9-9715-6ef0cc671c9e	839f3441-a924-45aa-b78c-19f64b24ef1b	a5f2f2d72a3246077775aa0a46fe8cca1f4e61c0269f6e6c28901ef027c9951b	f2e12701-b143-4a2e-ba1d-a83c44c32aef	\N	\N	2026-10-17 10:59:07.946	\N	::1	curl/8.5.0	2026-09-17 10:59:07.948
7f3f71ae-76a3-42fd-af47-2bb69cab855b	839f3441-a924-45aa-b78c-19f64b24ef1b	db8fe137cb561bd083a19bf96f942ff1f4a1839d1d216dfa6a1b22d8059cc155	71173753-5033-4765-b744-84e74cacf258	\N	\N	2026-10-17 10:59:08.26	\N	::1	curl/8.5.0	2026-09-17 10:59:08.261
f6a4e4a5-65e4-43c9-bb45-91b7ac4c16f2	839f3441-a924-45aa-b78c-19f64b24ef1b	a9e0325425aae623b214842c23660872abccd0e84974f74aceb0ac118754fe27	94814496-478d-4208-924f-5171d7f5ffcd	\N	\N	2026-10-17 10:59:08.605	\N	::1	curl/8.5.0	2026-09-17 10:59:08.606
6636dc61-b877-4b4c-9e37-2afab98fdaeb	839f3441-a924-45aa-b78c-19f64b24ef1b	28e04aba2412293c0a2be7fad8a829f8fb57192a8a003e4c703fc264552c10c9	782c5a39-c1be-484f-aea5-17cfb779ded3	\N	\N	2026-10-17 10:59:08.961	\N	::1	curl/8.5.0	2026-09-17 10:59:08.962
802343bf-34ab-41fa-828d-13082761592c	839f3441-a924-45aa-b78c-19f64b24ef1b	7560da9c35e965657c7bed54174f4037c835fb812406e0bb7c5ddf955454f135	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:01:49.953	3d10d29e2688a5cc9b9f1f46a12db3bf42c17cf13972d489f0f294b327365927	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 10:41:24.929
e8e983ad-39e9-4bed-a9ab-1e44fe848646	839f3441-a924-45aa-b78c-19f64b24ef1b	52651cf7d5254325c8a1d9cd75a11fdd9bd03d301cc5d3312639367ecf3acee1	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:01:49.97	5c6aca01808dc887ca21b8b3f074fe87822acd4d2fdf984de2503e8b32a1246c	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 10:43:11.52
dd8c1cee-b4b9-4b82-af00-4d0bdfc80758	839f3441-a924-45aa-b78c-19f64b24ef1b	930eb243ac9f0a1bdf97af89b3ded27d499deddcb62250b32987dd6425055d35	2da62219-6ad4-42c1-be9c-9bf49bd652ac	\N	\N	2026-10-17 10:59:09.282	\N	::1	curl/8.5.0	2026-09-17 10:59:09.283
4bf9d4fd-46a1-40db-b328-eee717af2168	839f3441-a924-45aa-b78c-19f64b24ef1b	8554986891c2d6724694766d68c8403ca0bb2b1f6b69f0fdd00d5827a5b9f582	5debbd52-7678-48a5-a05d-b208b2ffe979	\N	\N	2026-10-17 10:59:09.642	\N	::1	curl/8.5.0	2026-09-17 10:59:09.643
c348509f-1f62-45d0-96f1-f93fc34c0f97	839f3441-a924-45aa-b78c-19f64b24ef1b	1e5ff1f83456549ff7844656cbd1b59116e1c30c6b640e9cc85378bcabfd3254	59aef025-116b-4de0-9659-dc93b00c4b82	\N	\N	2026-10-17 10:59:09.966	\N	::1	curl/8.5.0	2026-09-17 10:59:09.967
3bc6aeba-604a-4d7d-987a-cb90f51a3325	839f3441-a924-45aa-b78c-19f64b24ef1b	27239a22af3ea0ece189cf4f9321b40f1c39ffd10754d7ac2b1e099091fba655	0921a5a0-94be-4709-a752-7a5faa03e49b	\N	\N	2026-10-17 10:59:10.265	\N	::1	curl/8.5.0	2026-09-17 10:59:10.266
7ba70689-7262-445e-ac6e-a6f06bb776b9	839f3441-a924-45aa-b78c-19f64b24ef1b	5c6aca01808dc887ca21b8b3f074fe87822acd4d2fdf984de2503e8b32a1246c	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:02:08.641	379f2a2c633bf62360434de99111393aa486c5087b24978e0c8fce4d96e15d07	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:01:49.972
d13fde36-526e-4999-8592-cd5005579824	839f3441-a924-45aa-b78c-19f64b24ef1b	3d10d29e2688a5cc9b9f1f46a12db3bf42c17cf13972d489f0f294b327365927	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:02:08.65	9c936200ee47d048e9744fd1499784f9b69749ca0fffd5d763b8825895c02b06	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:01:49.956
8dae3d56-140c-4099-a716-ae6553f259c8	839f3441-a924-45aa-b78c-19f64b24ef1b	9c936200ee47d048e9744fd1499784f9b69749ca0fffd5d763b8825895c02b06	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:05:51.699	f4424b40d1a7aefafe12a3fbbd77709818fede66d128972a7630fc8e8b02e076	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:02:08.651
ae0822ea-9fec-4ea3-ab45-89c1a8add635	839f3441-a924-45aa-b78c-19f64b24ef1b	f4424b40d1a7aefafe12a3fbbd77709818fede66d128972a7630fc8e8b02e076	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:06:00.509	558d01d460e357ad52cfaa4e29cb3783a1b014f7aadaaac7cd68704b2e2a4ba8	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:05:51.701
bccffa91-c364-486e-a670-a4039f5e2fcc	839f3441-a924-45aa-b78c-19f64b24ef1b	558d01d460e357ad52cfaa4e29cb3783a1b014f7aadaaac7cd68704b2e2a4ba8	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:07:41.501	d24d25010c8aaa1ef763ca21ff9635659bc7143c528430b718b6d8e129f642ec	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:06:00.51
9b993d5e-d2c2-4dab-ae51-c8ba767fc621	839f3441-a924-45aa-b78c-19f64b24ef1b	d24d25010c8aaa1ef763ca21ff9635659bc7143c528430b718b6d8e129f642ec	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:09:54.456	7b5f05f2f847e13f9b1a7b4c4ecd47318e5e3e5cf776491d0e29026ee50af857	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:07:41.502
3b1c93fd-ee30-4e46-a6d4-90b3c541d146	839f3441-a924-45aa-b78c-19f64b24ef1b	7b5f05f2f847e13f9b1a7b4c4ecd47318e5e3e5cf776491d0e29026ee50af857	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:09:58.377	17ddfdcdd27dd5c69a24f90fb14e6c096dca6299448bd82d338610d8451ed9d6	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:09:54.457
69d012bb-4c26-4b7e-9aee-d5149cf466bf	839f3441-a924-45aa-b78c-19f64b24ef1b	17ddfdcdd27dd5c69a24f90fb14e6c096dca6299448bd82d338610d8451ed9d6	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:02.25	e972724cf9a38824ff94f5e650d671d6da74d18c4e2a9ed2b38e28254830712e	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:09:58.378
9e7086c9-60cd-49d4-865e-1041c2b71dcf	839f3441-a924-45aa-b78c-19f64b24ef1b	e972724cf9a38824ff94f5e650d671d6da74d18c4e2a9ed2b38e28254830712e	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:36.943	142438d7148ebebfdc5b9de7036b10c9e6dfed9c0683f6093912dfe8afbbb7c6	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:02.251
6d41e145-15e2-420b-af77-1fe8675b3d30	839f3441-a924-45aa-b78c-19f64b24ef1b	142438d7148ebebfdc5b9de7036b10c9e6dfed9c0683f6093912dfe8afbbb7c6	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:42.141	bad3108d63f3f42a06ae0d7de1124e470a208ae80e10d3f1ca20aa12de6bc813	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:36.944
e8f501f6-247f-40d5-b17d-9b165bb9e451	839f3441-a924-45aa-b78c-19f64b24ef1b	bad3108d63f3f42a06ae0d7de1124e470a208ae80e10d3f1ca20aa12de6bc813	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:44.758	e1446edb33df59a3d515704a38c4f5b582de24e7dd9f036c6c5a67f7c198f9f8	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:42.142
8747c7fb-952a-4804-9138-8c29ab92d8d3	839f3441-a924-45aa-b78c-19f64b24ef1b	e1446edb33df59a3d515704a38c4f5b582de24e7dd9f036c6c5a67f7c198f9f8	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:47.374	b6fd70a5b419c52e9713c6317e2db04c303af8ab467a716d99fc5fb160a70cbe	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:44.759
368c3103-ee61-4682-af45-de1df95785ac	839f3441-a924-45aa-b78c-19f64b24ef1b	b6fd70a5b419c52e9713c6317e2db04c303af8ab467a716d99fc5fb160a70cbe	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:49.995	5bfe64bddd7cd03818b75c6d854e3f8500ec4e145f101d50db89c3754a6b68b8	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:47.375
8515107e-e063-488d-97f0-1cc0f9392141	839f3441-a924-45aa-b78c-19f64b24ef1b	5bfe64bddd7cd03818b75c6d854e3f8500ec4e145f101d50db89c3754a6b68b8	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:52.611	ad149d8dbce1a6a305c165a6dcb798c92044140a3c8912544a464b15d84078a5	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:49.996
20e3be30-ea48-4770-b6f4-7e070c5f9bca	839f3441-a924-45aa-b78c-19f64b24ef1b	ad149d8dbce1a6a305c165a6dcb798c92044140a3c8912544a464b15d84078a5	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:55.248	b0f7a6c28ba676259caa4de2e62c60a1b2715eaca3d0a6e984e481251f3b0b94	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:52.612
063577a6-164d-4a22-a6ad-ec951b90a758	839f3441-a924-45aa-b78c-19f64b24ef1b	b0f7a6c28ba676259caa4de2e62c60a1b2715eaca3d0a6e984e481251f3b0b94	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:10:57.862	0c3cade919af96ac9c07419e6a9603351176a4ccb89177b57e70c905ee92964d	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:55.248
3d904a59-5e99-4682-820d-8358a20fe3f9	839f3441-a924-45aa-b78c-19f64b24ef1b	0c3cade919af96ac9c07419e6a9603351176a4ccb89177b57e70c905ee92964d	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:11:00.487	8454e20aad37e2122dc150f386a363c0d775b0ac70c942bd3cbfeeb67646ceb6	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:10:57.864
bf7ce7e4-dbd3-4e95-8f88-c875892f24cb	839f3441-a924-45aa-b78c-19f64b24ef1b	8454e20aad37e2122dc150f386a363c0d775b0ac70c942bd3cbfeeb67646ceb6	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:11:03.102	1d15a2dfd4d395e9ffdac71afbe7a70fc22a35213d3a2397ea5d8e45fd4f9d11	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:11:00.488
4e5b873b-607b-4a20-8efa-ae3314e5d25d	839f3441-a924-45aa-b78c-19f64b24ef1b	379f2a2c633bf62360434de99111393aa486c5087b24978e0c8fce4d96e15d07	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:19:37.251	00588ed2bf9508f7ab788bb7ac1c8e38fddf4024388782680100e07a27f1e19d	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:02:08.643
0bf06523-2b4e-4aa0-8634-0a221b360704	839f3441-a924-45aa-b78c-19f64b24ef1b	1d15a2dfd4d395e9ffdac71afbe7a70fc22a35213d3a2397ea5d8e45fd4f9d11	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:11:05.721	cfd31d07727f03e641565ca0e72b6f5610a0b27bb4a94af1b67da334e5ee0abf	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:11:03.103
47c661a3-e034-4908-9ffc-6ed725426cf7	839f3441-a924-45aa-b78c-19f64b24ef1b	cfd31d07727f03e641565ca0e72b6f5610a0b27bb4a94af1b67da334e5ee0abf	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:11:08.345	cf7dfa6af56f0b7dd1fc6ad4d1af3ad8a7fbf2e4c0b075915bd9d0d40b754aec	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:11:05.722
162f7183-7ad8-462b-b0b1-ecbdfb06ec9a	839f3441-a924-45aa-b78c-19f64b24ef1b	cf7dfa6af56f0b7dd1fc6ad4d1af3ad8a7fbf2e4c0b075915bd9d0d40b754aec	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:11:10.957	0172424fb2fbb8a377e2ae49a45e45220ade14e3d2d911c00a5360a75c0b9324	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:11:08.346
ba4a6d49-50eb-42dc-bf45-424b91f454db	839f3441-a924-45aa-b78c-19f64b24ef1b	0172424fb2fbb8a377e2ae49a45e45220ade14e3d2d911c00a5360a75c0b9324	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:11:21.658	17ee96498dced982a4c0f9ca937a841a3fed666fecaf03ce7ab49da33046857a	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:11:10.958
19692389-ec6a-48bf-a6be-a205c263b257	839f3441-a924-45aa-b78c-19f64b24ef1b	00588ed2bf9508f7ab788bb7ac1c8e38fddf4024388782680100e07a27f1e19d	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:19:37.404	94ca4c8a3d44fad73a8b50acd8dc20eeb519badf853e7f4c3570bdf13e930875	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:19:37.252
198a7a9f-089d-471c-b181-b37b110068e4	839f3441-a924-45aa-b78c-19f64b24ef1b	94ca4c8a3d44fad73a8b50acd8dc20eeb519badf853e7f4c3570bdf13e930875	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:19:37.635	b92e2c9bd5e40a2adc1fbd29dc3d35b8647e28ecddb981a948cd4698b73e5db4	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:19:37.405
854da5ab-db74-455e-9f89-135d1a4347dc	839f3441-a924-45aa-b78c-19f64b24ef1b	b92e2c9bd5e40a2adc1fbd29dc3d35b8647e28ecddb981a948cd4698b73e5db4	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:19:37.783	bd1e9b5a46c62ca5aee72105eb95aad603899a46a9e8f949054d86079e384010	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:19:37.636
a9c54283-79d8-4cfd-a5d5-7c0117a9cdbb	839f3441-a924-45aa-b78c-19f64b24ef1b	bd1e9b5a46c62ca5aee72105eb95aad603899a46a9e8f949054d86079e384010	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:20:47.58	d2579f84a1dc41a3d18938b88505ebb858db4854d058263635d322977fb2f611	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:19:37.784
cb0636ed-d0c8-44e6-9488-df7373702dd3	839f3441-a924-45aa-b78c-19f64b24ef1b	17ee96498dced982a4c0f9ca937a841a3fed666fecaf03ce7ab49da33046857a	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:26:22.035	49901a9c8e31939f154a7480d6422d631e48aa8a85f6aff4c3e3af8071fd7f30	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:11:21.659
728ae074-0b3f-4265-9a92-99c22637f202	839f3441-a924-45aa-b78c-19f64b24ef1b	49901a9c8e31939f154a7480d6422d631e48aa8a85f6aff4c3e3af8071fd7f30	a555e2cc-fee3-4dc1-be61-41631e7f5b68	2026-09-17 11:31:22.021	\N	2026-10-17 10:26:47.574	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-17 11:26:22.036
730b83c3-7101-4277-b7c4-3aaac0fa7936	839f3441-a924-45aa-b78c-19f64b24ef1b	d2579f84a1dc41a3d18938b88505ebb858db4854d058263635d322977fb2f611	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-17 11:36:39.986	8d4ad552fc5bd574b2daae69867b994a1bd8ebdc90a57eab532a1a6ad10e34c6	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:20:47.581
05d8e7e5-f4e0-4352-b143-d1a8c19313e6	839f3441-a924-45aa-b78c-19f64b24ef1b	8d4ad552fc5bd574b2daae69867b994a1bd8ebdc90a57eab532a1a6ad10e34c6	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-18 04:12:01.786	dc1b39a72da58c873539c02e210362b0cd589bc178f6b780c1fe8f2ede7a4bdc	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-17 11:36:39.987
4a4f90f8-ae35-47be-ae6d-3fe6b81dde8b	839f3441-a924-45aa-b78c-19f64b24ef1b	c711ff955eb58099c7b22416864f1844561829132ae3e53e2e1bc83ef5a0db8c	6e430076-cb93-4ae3-b11f-927cad85d3b2	\N	\N	2026-10-18 04:17:41.071	\N	::1	curl/8.5.0	2026-09-18 04:17:41.073
8f1553d1-b785-4b7e-b6b3-427f8bee3c63	839f3441-a924-45aa-b78c-19f64b24ef1b	8c30d956120171c5e9ceaef1bfb64dffb8e8e0e831637be9a23806584a9bf8fd	e0802a56-cfec-4f05-90b6-8b4c0bc55906	\N	\N	2026-10-18 04:17:49.073	\N	::1	curl/8.5.0	2026-09-18 04:17:49.075
a6d86b4f-d86a-40f4-ba1a-13da702f155a	839f3441-a924-45aa-b78c-19f64b24ef1b	5d61a959aec08850bd50f737126220e2786c0fd42ed61b1ad3b828ebf0ca9a31	c12b9b17-2e1a-4b73-b80e-0e275dfbf436	\N	\N	2026-10-18 04:17:58.303	\N	::1	curl/8.5.0	2026-09-18 04:17:58.304
5aa49599-2a1e-46ce-b123-c7693d35722d	839f3441-a924-45aa-b78c-19f64b24ef1b	5eb19765f136d19bfaee3b976fd016af524fce9148d4128783aee53c08d0893d	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:22:31.489	ce9c3b422806d10190f19fba67771dec3f56b6068cf0ccc45c290edffaec52a4	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:22:13.809
9d70894b-b467-4e5a-9e9e-a6685b0ddc45	839f3441-a924-45aa-b78c-19f64b24ef1b	ce9c3b422806d10190f19fba67771dec3f56b6068cf0ccc45c290edffaec52a4	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:23:49.867	9010f50a74ec87991e4f86fb3a79d5b2805f16c04086d6511a010b3f5e448c5b	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:22:31.491
b7d1c48f-3b2d-4b2f-9a54-07c30b11e5f7	839f3441-a924-45aa-b78c-19f64b24ef1b	9010f50a74ec87991e4f86fb3a79d5b2805f16c04086d6511a010b3f5e448c5b	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:06.488	81a573ee6f8f5db528990aab6acf33af5080531536ac2b2944396c93dad5a1b4	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:23:49.869
2465f073-68a9-4689-9126-365804797395	839f3441-a924-45aa-b78c-19f64b24ef1b	81a573ee6f8f5db528990aab6acf33af5080531536ac2b2944396c93dad5a1b4	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:08.953	14464ffc1229e9a0a2afde9d52628cd21b3954a1d488e36b3056c1caac5d931c	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:06.49
5d267b55-aa45-41f0-8100-15135d9f4277	839f3441-a924-45aa-b78c-19f64b24ef1b	14464ffc1229e9a0a2afde9d52628cd21b3954a1d488e36b3056c1caac5d931c	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:11.587	11a78c118bed270659e24a8c6606e2ead8047219eeccdf6f397d15b797345b2b	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:08.955
5a67d3ce-fc2e-43ba-a1bb-d2f6d27c8e34	839f3441-a924-45aa-b78c-19f64b24ef1b	11a78c118bed270659e24a8c6606e2ead8047219eeccdf6f397d15b797345b2b	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:14.182	4c2bcf34456d036df9b9912d5f1a91df6103c0951dcb1d5e227c20023f0cb1a9	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:11.589
ba7ca3b7-5005-4db9-9834-1a5a9fa4f638	839f3441-a924-45aa-b78c-19f64b24ef1b	4c2bcf34456d036df9b9912d5f1a91df6103c0951dcb1d5e227c20023f0cb1a9	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:16.826	24bf7177b0a5e8c677dca29e9c8fda21acacbf6760276c424284840795fa903b	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:14.184
baa01e56-c480-4323-9f56-1533b5a39f6f	839f3441-a924-45aa-b78c-19f64b24ef1b	24bf7177b0a5e8c677dca29e9c8fda21acacbf6760276c424284840795fa903b	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:19.446	bad6f0c7bc80c84b3947b468797e374e2279c89089a0e3a8a44a6c44fffea53c	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:16.828
5689a819-4f61-425f-bfec-0938d459231e	839f3441-a924-45aa-b78c-19f64b24ef1b	407e283cccbf60da3ce269ace84c43c7a126b1765efa1843e7be8905e9ce7f3a	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:29.962	026a2ebf387d8c1dc4c1fde518f7367113fc00ee2dbbb187dd6c60d508d0bb17	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:27.322
3c6c9b00-a2a7-4b82-990e-9911bbf25b59	839f3441-a924-45aa-b78c-19f64b24ef1b	bad6f0c7bc80c84b3947b468797e374e2279c89089a0e3a8a44a6c44fffea53c	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:22.06	ed9423ebeff1b3bcc3a3971b219200095d4a82d8ab99906b0e52a56177d70573	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:19.448
8a9d7c70-7291-4f6e-b965-e489b8a7fd29	839f3441-a924-45aa-b78c-19f64b24ef1b	ed9423ebeff1b3bcc3a3971b219200095d4a82d8ab99906b0e52a56177d70573	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:24.705	25d5aa77d6110cc883ed877aff102e3dfbdfb0b7531d75a0f0d320c3c633dc39	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:22.062
a679d254-0490-4856-b8a7-ec5cefc1500c	839f3441-a924-45aa-b78c-19f64b24ef1b	25d5aa77d6110cc883ed877aff102e3dfbdfb0b7531d75a0f0d320c3c633dc39	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:27.32	407e283cccbf60da3ce269ace84c43c7a126b1765efa1843e7be8905e9ce7f3a	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:24.707
3be02430-5b29-4e11-9d47-bd0a1ccbfb15	839f3441-a924-45aa-b78c-19f64b24ef1b	026a2ebf387d8c1dc4c1fde518f7367113fc00ee2dbbb187dd6c60d508d0bb17	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:25:32.605	fe906a2a6451b2d6d2a22c7139a5b344ba21a21f4bbe245baf9694afff854cea	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:29.964
6bfd06af-5905-47ca-b574-20bb764fe445	839f3441-a924-45aa-b78c-19f64b24ef1b	dc1b39a72da58c873539c02e210362b0cd589bc178f6b780c1fe8f2ede7a4bdc	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-18 04:27:03.169	c60e3d2e93b8e06abb3971464e0bbdcee8481d86cc54ca0520f778e8c65db1d8	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-18 04:12:01.791
c0d869a3-9ae9-423d-83cc-9ed4c1ce6fb3	839f3441-a924-45aa-b78c-19f64b24ef1b	fe906a2a6451b2d6d2a22c7139a5b344ba21a21f4bbe245baf9694afff854cea	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:30:14.467	fd15f163bb94f53536625fc50a7cf63cce486546af081761889d0453b586068c	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:25:32.607
3eb3bae2-aebb-4587-a9d4-90c2236e4102	839f3441-a924-45aa-b78c-19f64b24ef1b	fd15f163bb94f53536625fc50a7cf63cce486546af081761889d0453b586068c	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:30:34.915	b8058bfc21137d45c227d709bd7385390038960edfbd7b5e887ed108a2d90d73	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:30:14.469
e2082cb6-4b59-48ff-9bab-f7d9e760498a	839f3441-a924-45aa-b78c-19f64b24ef1b	b8058bfc21137d45c227d709bd7385390038960edfbd7b5e887ed108a2d90d73	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:32:59.285	71c0183da15fbc002c54066098f75fec347a7348cd9fab15397a12519036f5f0	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:30:34.917
57d101d2-cdf5-4bd5-b383-25eeae0020a3	839f3441-a924-45aa-b78c-19f64b24ef1b	71c0183da15fbc002c54066098f75fec347a7348cd9fab15397a12519036f5f0	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:33:29.065	393940e101e6d548f1c1c579417e88d80a2f988b4f28620eff92dd60d9260ff1	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:32:59.287
63b25556-d0b5-4c59-98e8-e721e1edf588	839f3441-a924-45aa-b78c-19f64b24ef1b	c60e3d2e93b8e06abb3971464e0bbdcee8481d86cc54ca0520f778e8c65db1d8	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-18 04:42:43.119	d8c748c8b8febf5a0a9442f04747390c87cc0b90bc621efd58e84fd847e187fd	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-18 04:27:03.17
bc70ac51-6fc3-4494-804c-b5a3e6f37932	839f3441-a924-45aa-b78c-19f64b24ef1b	393940e101e6d548f1c1c579417e88d80a2f988b4f28620eff92dd60d9260ff1	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:48:29.503	3183ba90f3423b441e112bf59728a52b4bd728727c384a72358a706e0deb5c3e	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:33:29.066
3d708223-c584-4a5e-99e4-8443b4c2f52e	839f3441-a924-45aa-b78c-19f64b24ef1b	d8c748c8b8febf5a0a9442f04747390c87cc0b90bc621efd58e84fd847e187fd	919f5379-201f-47f6-85eb-83cc7f43059c	2026-09-18 04:48:35.108	\N	2026-10-17 10:24:03.944	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-18 04:42:43.121
a0eeab9a-f4b7-4b98-adfa-499987197ac9	839f3441-a924-45aa-b78c-19f64b24ef1b	3183ba90f3423b441e112bf59728a52b4bd728727c384a72358a706e0deb5c3e	7b8d55cf-b9a3-4020-852f-0f8580ad21f7	2026-09-18 04:53:29.477	\N	2026-10-18 04:22:13.808	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36	2026-09-18 04:48:29.506
f3018377-a7ad-4de2-b3ee-fccedc5ddfa5	839f3441-a924-45aa-b78c-19f64b24ef1b	f12b5c6bdebce018db65e8ac8f37998fab21bb97e1bdbe805db1aa2e7d982ac4	4eba3fb0-2e19-44db-8920-3dc4530bb3e4	2026-09-18 05:11:43.138	0485de0033c12d511efd647658ea1e715ed1e3eea3263fd544ac54b228d6d982	2026-10-18 04:56:42.69	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-18 04:56:42.694
c58a1c13-b289-43ff-a087-a7708074dede	839f3441-a924-45aa-b78c-19f64b24ef1b	0485de0033c12d511efd647658ea1e715ed1e3eea3263fd544ac54b228d6d982	4eba3fb0-2e19-44db-8920-3dc4530bb3e4	2026-09-18 05:17:00.11	\N	2026-10-18 04:56:42.69	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-18 05:11:43.143
f00b3a7a-516c-4c90-b3cd-f5aac6214496	839f3441-a924-45aa-b78c-19f64b24ef1b	0129e2279a9e83700f4fee1faf9d28b52a15ff6bb04acc6e651d8e54116e25f8	43c3ca90-ee19-4976-bb59-b6daae24024e	2026-09-18 05:28:32.154	\N	2026-10-18 05:21:27.199	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-18 05:21:27.201
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id, created_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, is_active, created_at, updated_at) FROM stdin;
5a3413bf-433d-4679-bd9c-ea32960445b7	Admin	Platform administrator with full system access.	t	2026-07-23 07:40:19.434	2026-09-10 08:47:03.235
a5f1c6de-195c-4025-b05b-34436308d626	Patient	Patient with access to personal health records and appointments.	t	2026-07-23 07:40:19.442	2026-09-10 08:47:03.246
bdfc3c5a-552c-433c-bc88-7323cd311935	Doctor	Licensed physician with access to assigned patient records.	t	2026-07-23 07:40:19.445	2026-09-10 08:47:03.251
05339272-31ec-499c-b7c8-1d9f4ff0cada	HealthcareWorker	Clinical support staff assisting with patient care.	t	2026-07-23 07:40:19.449	2026-09-10 08:47:03.255
b755cf02-8627-488d-92d3-5db18c098d46	LabTechnician	Laboratory staff managing lab reports and imaging data.	t	2026-07-23 07:40:19.452	2026-09-10 08:47:03.26
\.


--
-- Data for Name: staff_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_profiles (id, user_id, first_name, last_name, job_title, department, employee_id, phone_number, deleted_at, created_at, updated_at) FROM stdin;
20664f43-6104-497e-a909-00fcdc794454	b771bca7-5e4a-43d1-9ccd-29c307b5e79e	Test	FieldWorker	Field Registration Officer	\N	\N	\N	\N	2026-09-11 05:39:29.428	2026-09-11 05:39:29.428
\.


--
-- Data for Name: stroke_assessments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stroke_assessments (id, encounter_id, lkw_at, lkw_certainty, lkw_source, lkw_note, facial_weakness, arm_weakness, leg_weakness, speech_difficulty, sudden_confusion, vision_problem, severe_headache, balance_problem, loss_of_consciousness, other_symptom_note, urgent_flag, on_anticoagulants, created_by_user_id, created_at, updated_at) FROM stdin;
7f2789f1-d7f0-4e1a-b0cd-8a367d41f9ae	5822a038-1ba1-4296-afef-f0ac9dffa1d4	2026-06-25 00:45:00	Approximate	Family	Family last saw her well at about 6:15am before breakfast.	t	t	f	t	f	f	f	t	f	Right arm drift on examination; speech slurred but comprehension intact.	t	f	\N	2026-09-17 11:09:22.798	2026-09-17 11:09:22.798
\.


--
-- Data for Name: stroke_lkw_revisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stroke_lkw_revisions (id, assessment_id, previous_lkw_at, previous_certainty, new_lkw_at, new_certainty, new_source, reason, changed_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, role_id, is_verified, is_active, failed_login_attempts, locked_until, last_login_at, password_changed_at, verification_token, verification_expires, deleted_at, created_at, updated_at) FROM stdin;
67d1d7a2-3dee-498b-8e08-f7b16896ed2f	testpatient@oncotrace.health	$argon2id$v=19$m=65536,t=3,p=4$QaOp+T8Ft/T0fXxjvZynaw$mxwxCjO4bypCZ1ob6nN8MKdWH84CfxkmYlBoM14TY0c	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	2026-07-28 04:04:45.581	2026-07-28 03:59:10.686	\N	\N	\N	2026-07-28 03:59:10.688	2026-07-28 04:04:45.582
c45486ee-7c9d-4005-9909-a2f7b52ff2c8	newpatient@oncotrace.health	$argon2id$v=19$m=65536,t=3,p=4$45p0xVoISKAuxd/sGb4nCg$EUS/UtUYWitBF8S5mdvECzN4d+pC8wYK1Ogg8NlP700	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	\N	2026-07-28 04:17:14.358	\N	\N	\N	2026-07-28 04:17:14.359	2026-07-28 04:17:14.359
1e942aea-1b44-43eb-a0f2-52eb6c79af0f	rajesh@careflow.health	$argon2id$v=19$m=65536,t=3,p=4$RCE/BGbW6cEbI1vl0fY0CQ$LMgGXx6ri4t37N/DgeX0DBoeWiok9Wbka6SVQSRhuN4	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	\N	2026-07-28 05:04:56.868	\N	\N	\N	2026-07-28 05:04:56.87	2026-07-28 05:04:56.87
44e80ca0-5f14-4de5-9739-0fcd837f0054	testmobile123@example.com	$argon2id$v=19$m=65536,t=3,p=4$bq9hst9zoN9drfwgNCkFVQ$QuSbaCDLj9WxTxxXlA1O13HenlynrNuBI8JDNSHHq1k	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	\N	2026-08-08 04:48:47.544	\N	\N	\N	2026-08-08 04:48:47.546	2026-08-08 04:48:47.546
d8f89293-57a8-4efe-9496-4147905f5dfe	demo.doctor.nair@stroke-ai.invalid	$argon2id$v=19$m=65536,t=3,p=4$2FIkfKoCs18ae93TtIrQbw$ExO0PQFHioj3l9UIJ1r+T+ASkIBh/5TpLjySL3pr1B4	bdfc3c5a-552c-433c-bc88-7323cd311935	t	t	0	\N	\N	\N	\N	\N	\N	2026-09-09 10:22:24.356	2026-09-09 10:22:24.356
2e0139cb-5abe-4705-8971-0f5406e78cc8	demo.doctor.raja@stroke-ai.invalid	$argon2id$v=19$m=65536,t=3,p=4$2FIkfKoCs18ae93TtIrQbw$ExO0PQFHioj3l9UIJ1r+T+ASkIBh/5TpLjySL3pr1B4	bdfc3c5a-552c-433c-bc88-7323cd311935	t	t	0	\N	\N	\N	\N	\N	\N	2026-09-09 10:22:24.373	2026-09-09 10:22:24.373
a0a8bb57-bc87-4aeb-b8d2-09aa42ba6380	demo.doctor.selvam@stroke-ai.invalid	$argon2id$v=19$m=65536,t=3,p=4$2FIkfKoCs18ae93TtIrQbw$ExO0PQFHioj3l9UIJ1r+T+ASkIBh/5TpLjySL3pr1B4	bdfc3c5a-552c-433c-bc88-7323cd311935	t	t	0	\N	\N	\N	\N	\N	\N	2026-09-09 10:22:24.383	2026-09-09 10:22:24.383
c1537b1d-fabd-4d07-9b87-cf6f045108a8	demo.doctor.kumar@stroke-ai.invalid	$argon2id$v=19$m=65536,t=3,p=4$2FIkfKoCs18ae93TtIrQbw$ExO0PQFHioj3l9UIJ1r+T+ASkIBh/5TpLjySL3pr1B4	bdfc3c5a-552c-433c-bc88-7323cd311935	t	t	0	\N	\N	\N	\N	\N	\N	2026-09-09 10:22:24.391	2026-09-09 10:22:24.391
8250825b-8ed2-4879-bc56-25d409f3cbe8	anand.shriai@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$TcBNytpVN4QwktmpwgBz5Q$MOBDz+jkjJD5Y0cTdQdLODp3g0u1XnKMMsdNBY2C/Vc	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	2026-09-11 06:42:43.27	2026-07-28 05:15:49.514	f8cecbede7460fc59b50b64924b4b69272b399149abf458b481e70d67449fc4f	2026-08-07 05:08:07.832	\N	2026-07-28 05:15:49.515	2026-09-11 06:42:43.272
f863144b-4b2a-4174-bb49-8fdf784cf731	anandjyothis57@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$SUV6XduEReTAOwbNaHv3mw$gRGY8Ge+raeYdYppJOWTZoyTCIAlkUtjVvxF7U4Y0c4	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	2026-09-10 08:58:39.81	2026-08-24 05:01:15.476	\N	\N	\N	2026-08-24 05:01:15.48	2026-09-10 08:58:39.811
622f2284-d2c5-4f14-9ce6-9ac55c98cf23	anandjyothis@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$ARplhgX6Dz7hXnlUp0AqTw$R8citN4q0K3WxtdVtlMYh0lF2Y/+KdWMaYl3OFGomVs	a5f1c6de-195c-4025-b05b-34436308d626	f	t	0	\N	2026-09-11 06:42:52.437	2026-08-08 04:52:26.951	\N	\N	\N	2026-08-08 04:52:26.952	2026-09-11 06:42:52.438
839f3441-a924-45aa-b78c-19f64b24ef1b	demouser.strokeai@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$+eKoqYAwP0uu4HE7yeiavA$+OYGLqOcPGo0d4c7E2yuTy1bsjpyMKeVNaFSsnRYy1E	a5f1c6de-195c-4025-b05b-34436308d626	t	t	0	\N	2026-09-18 05:21:27.185	\N	\N	\N	\N	2026-09-10 08:47:03.775	2026-09-18 05:21:27.186
7c69fe30-a8a8-4d01-9c7a-8b25a4da6278	test.doctor.phase6@stroke-ai.invalid	$argon2id$v=19$m=65536,t=3,p=4$rJTKHyvoxFWXyFiz8ErAOA$/3lpjIbV08PaGpI5FH2gvE0KaWA4fpKdk5T+aeq8XDs	bdfc3c5a-552c-433c-bc88-7323cd311935	t	t	0	\N	2026-09-11 07:14:45.927	2026-09-11 05:39:41.876	\N	\N	\N	2026-09-11 05:39:41.879	2026-09-11 07:14:45.929
b771bca7-5e4a-43d1-9ccd-29c307b5e79e	test.hw.phase6@stroke-ai.invalid	$argon2id$v=19$m=65536,t=3,p=4$rJTKHyvoxFWXyFiz8ErAOA$/3lpjIbV08PaGpI5FH2gvE0KaWA4fpKdk5T+aeq8XDs	05339272-31ec-499c-b7c8-1d9f4ff0cada	t	t	0	\N	2026-09-11 07:14:48.267	2026-09-11 05:39:29.426	\N	\N	\N	2026-09-11 05:39:29.428	2026-09-11 07:14:48.268
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_daily ai_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: care_team_members care_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.care_team_members
    ADD CONSTRAINT care_team_members_pkey PRIMARY KEY (id);


--
-- Name: doctor_profiles doctor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_pkey PRIMARY KEY (id);


--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: patient_profiles patient_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: profile_photos profile_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_photos
    ADD CONSTRAINT profile_photos_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: staff_profiles staff_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (id);


--
-- Name: stroke_assessments stroke_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stroke_assessments
    ADD CONSTRAINT stroke_assessments_pkey PRIMARY KEY (id);


--
-- Name: stroke_lkw_revisions stroke_lkw_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stroke_lkw_revisions
    ADD CONSTRAINT stroke_lkw_revisions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations_user_id_deleted_at_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_deleted_at_updated_at_idx ON public.ai_conversations USING btree (user_id, deleted_at, updated_at);


--
-- Name: ai_messages_conversation_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_created_at_idx ON public.ai_messages USING btree (conversation_id, created_at);


--
-- Name: ai_usage_daily_user_id_day_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ai_usage_daily_user_id_day_key ON public.ai_usage_daily USING btree (user_id, day) NULLS NOT DISTINCT;


--
-- Name: appointments_doctor_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX appointments_doctor_id_idx ON public.appointments USING btree (doctor_id);


--
-- Name: appointments_patient_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX appointments_patient_id_idx ON public.appointments USING btree (patient_id);


--
-- Name: appointments_patient_id_status_scheduled_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX appointments_patient_id_status_scheduled_at_idx ON public.appointments USING btree (patient_id, status, scheduled_at);


--
-- Name: appointments_scheduled_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX appointments_scheduled_at_idx ON public.appointments USING btree (scheduled_at);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_severity_idx ON public.audit_logs USING btree (severity);


--
-- Name: audit_logs_user_id_action_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_user_id_action_created_at_idx ON public.audit_logs USING btree (user_id, action, created_at);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: care_team_members_doctor_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX care_team_members_doctor_id_idx ON public.care_team_members USING btree (doctor_id);


--
-- Name: care_team_members_patient_id_active_to_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX care_team_members_patient_id_active_to_idx ON public.care_team_members USING btree (patient_id, active_to);


--
-- Name: care_team_members_patient_id_doctor_id_care_role_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX care_team_members_patient_id_doctor_id_care_role_key ON public.care_team_members USING btree (patient_id, doctor_id, care_role);


--
-- Name: care_team_members_patient_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX care_team_members_patient_id_idx ON public.care_team_members USING btree (patient_id);


--
-- Name: doctor_profiles_bookable_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX doctor_profiles_bookable_idx ON public.doctor_profiles USING btree (specialty, last_name) WHERE ((deleted_at IS NULL) AND (is_verified = true));


--
-- Name: doctor_profiles_hpr_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX doctor_profiles_hpr_id_key ON public.doctor_profiles USING btree (hpr_id);


--
-- Name: doctor_profiles_last_name_first_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX doctor_profiles_last_name_first_name_idx ON public.doctor_profiles USING btree (last_name, first_name);


--
-- Name: doctor_profiles_registration_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX doctor_profiles_registration_number_key ON public.doctor_profiles USING btree (registration_number);


--
-- Name: doctor_profiles_specialty_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX doctor_profiles_specialty_idx ON public.doctor_profiles USING btree (specialty);


--
-- Name: doctor_profiles_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX doctor_profiles_user_id_key ON public.doctor_profiles USING btree (user_id);


--
-- Name: encounters_appointment_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX encounters_appointment_id_key ON public.encounters USING btree (appointment_id);


--
-- Name: encounters_created_by_user_id_started_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX encounters_created_by_user_id_started_at_idx ON public.encounters USING btree (created_by_user_id, started_at);


--
-- Name: encounters_patient_id_started_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX encounters_patient_id_started_at_idx ON public.encounters USING btree (patient_id, started_at);


--
-- Name: encounters_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX encounters_status_idx ON public.encounters USING btree (status);


--
-- Name: encounters_type_started_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX encounters_type_started_at_idx ON public.encounters USING btree (type, started_at);


--
-- Name: encounters_visit_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX encounters_visit_id_key ON public.encounters USING btree (visit_id);


--
-- Name: notifications_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at);


--
-- Name: notifications_user_id_read_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_read_at_idx ON public.notifications USING btree (user_id, read_at);


--
-- Name: password_reset_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_reset_tokens_expires_at_idx ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: patient_profiles_abha_id_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX patient_profiles_abha_id_hash_key ON public.patient_profiles USING btree (abha_id_hash);


--
-- Name: patient_profiles_date_of_birth_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX patient_profiles_date_of_birth_idx ON public.patient_profiles USING btree (date_of_birth);


--
-- Name: patient_profiles_last_name_first_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX patient_profiles_last_name_first_name_idx ON public.patient_profiles USING btree (last_name, first_name);


--
-- Name: patient_profiles_lower_last_first_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX patient_profiles_lower_last_first_idx ON public.patient_profiles USING btree (lower(last_name), lower(first_name));


--
-- Name: patient_profiles_lower_last_pattern_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX patient_profiles_lower_last_pattern_idx ON public.patient_profiles USING btree (lower(last_name) text_pattern_ops);


--
-- Name: patient_profiles_phone_number_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX patient_profiles_phone_number_hash_idx ON public.patient_profiles USING btree (phone_number_hash);


--
-- Name: patient_profiles_registration_source_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX patient_profiles_registration_source_created_at_idx ON public.patient_profiles USING btree (registration_source, created_at);


--
-- Name: patient_profiles_shri_patient_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX patient_profiles_shri_patient_id_key ON public.patient_profiles USING btree (shri_patient_id);


--
-- Name: patient_profiles_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX patient_profiles_user_id_key ON public.patient_profiles USING btree (user_id);


--
-- Name: permissions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permissions_name_key ON public.permissions USING btree (name);


--
-- Name: permissions_resource_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permissions_resource_action_idx ON public.permissions USING btree (resource, action);


--
-- Name: profile_photos_patient_profile_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profile_photos_patient_profile_id_key ON public.profile_photos USING btree (patient_profile_id);


--
-- Name: refresh_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_expires_at_idx ON public.refresh_tokens USING btree (expires_at);


--
-- Name: refresh_tokens_family_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_family_id_idx ON public.refresh_tokens USING btree (family_id);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: roles_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX roles_is_active_idx ON public.roles USING btree (is_active);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: staff_profiles_employee_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX staff_profiles_employee_id_key ON public.staff_profiles USING btree (employee_id);


--
-- Name: staff_profiles_last_name_first_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staff_profiles_last_name_first_name_idx ON public.staff_profiles USING btree (last_name, first_name);


--
-- Name: staff_profiles_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX staff_profiles_user_id_key ON public.staff_profiles USING btree (user_id);


--
-- Name: stroke_assessments_encounter_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stroke_assessments_encounter_id_key ON public.stroke_assessments USING btree (encounter_id);


--
-- Name: stroke_assessments_lkw_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stroke_assessments_lkw_at_idx ON public.stroke_assessments USING btree (lkw_at);


--
-- Name: stroke_assessments_urgent_flag_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stroke_assessments_urgent_flag_idx ON public.stroke_assessments USING btree (urgent_flag);


--
-- Name: stroke_lkw_revisions_assessment_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stroke_lkw_revisions_assessment_id_created_at_idx ON public.stroke_lkw_revisions USING btree (assessment_id, created_at);


--
-- Name: users_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_created_at_idx ON public.users USING btree (created_at);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_is_active_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_is_active_deleted_at_idx ON public.users USING btree (is_active, deleted_at);


--
-- Name: users_role_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_id_idx ON public.users USING btree (role_id);


--
-- Name: users_verification_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_verification_token_key ON public.users USING btree (verification_token);


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: care_team_members care_team_members_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.care_team_members
    ADD CONSTRAINT care_team_members_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: care_team_members care_team_members_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.care_team_members
    ADD CONSTRAINT care_team_members_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: doctor_profiles doctor_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: encounters encounters_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: encounters encounters_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: patient_profiles patient_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: profile_photos profile_photos_patient_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_photos
    ADD CONSTRAINT profile_photos_patient_profile_id_fkey FOREIGN KEY (patient_profile_id) REFERENCES public.patient_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staff_profiles staff_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stroke_assessments stroke_assessments_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stroke_assessments
    ADD CONSTRAINT stroke_assessments_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stroke_lkw_revisions stroke_lkw_revisions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stroke_lkw_revisions
    ADD CONSTRAINT stroke_lkw_revisions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.stroke_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict ICrHLThzGHRnF6aWnkei7ErRDUfFGWOoantVgL8vqeFKD1ciskdKed6xohCht84

