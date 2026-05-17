#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::ckb_constants::Source;
use ckb_std::error::SysError;
use ckb_std::high_level::{load_cell, load_cell_data, QueryIter};

const ACCEPTANCE_DATA_LEN: usize = 36; // agreement_hash(32) + version(4)
const AGREEMENT_DATA_LEN: usize = 68; // hash(32) + version(4) + uri_hash(32)

#[repr(i8)]
enum Error {
    IndexOutOfBound = 1,
    InvalidDataLength = 2,
    UpdateNotAllowed = 3,
    InvalidTransactionStructure = 4,
    AgreementDepNotFound = 5,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Self::IndexOutOfBound,
            SysError::ItemMissing => Self::IndexOutOfBound,
            SysError::LengthNotEnough(_) => Self::IndexOutOfBound,
            SysError::Encoding => Self::IndexOutOfBound,
            SysError::Unknown(code) => panic!("unexpected sys error {}", code),
            _ => Self::IndexOutOfBound,
        }
    }
}

fn read_u32_le(raw: &[u8]) -> u32 {
    let mut buf = [0u8; 4];
    buf.copy_from_slice(raw);
    u32::from_le_bytes(buf)
}

fn run() -> Result<(), Error> {
    let group_input_count = QueryIter::new(load_cell, Source::GroupInput).count();
    let group_output_count = QueryIter::new(load_cell, Source::GroupOutput).count();

    if group_input_count != 0 {
        return Err(Error::UpdateNotAllowed);
    }

    if group_output_count != 1 {
        return Err(Error::InvalidTransactionStructure);
    }

    let output_data = load_cell_data(0, Source::GroupOutput)?;
    if output_data.len() != ACCEPTANCE_DATA_LEN {
        return Err(Error::InvalidDataLength);
    }

    let acceptance_hash = &output_data[0..32];
    let acceptance_version = read_u32_le(&output_data[32..36]);

    for dep_data in QueryIter::new(load_cell_data, Source::CellDep) {
        if dep_data.len() != AGREEMENT_DATA_LEN {
            continue;
        }

        let agreement_hash = &dep_data[0..32];
        let agreement_version = read_u32_le(&dep_data[32..36]);

        if agreement_hash == acceptance_hash && agreement_version == acceptance_version {
            return Ok(());
        }
    }

    Err(Error::AgreementDepNotFound)
}

pub fn program_entry() -> i8 {
    match run() {
        Ok(()) => 0,
        Err(err) => err as i8,
    }
}
