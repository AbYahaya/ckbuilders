#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::ckb_constants::Source;
use ckb_std::ckb_types::{bytes::Bytes, prelude::*};
use ckb_std::error::SysError;
use ckb_std::high_level::{load_cell_data, load_script, QueryIter};

const ARGS_LEN: usize = 8;

#[repr(i8)]
enum Error {
    IndexOutOfBound = 1,
    InvalidArgsLen = 2,
    DataLimitExceeded = 3,
    DataMinimumNotMet = 4,
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
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    if args.len() != ARGS_LEN {
        return Err(Error::InvalidArgsLen);
    }

    let data_min = read_u32_le(&args[0..4]);
    let data_max = read_u32_le(&args[4..8]);

    for data in QueryIter::new(load_cell_data, Source::GroupOutput) {
        let len = data.len() as u32;
        if len < data_min {
            return Err(Error::DataMinimumNotMet);
        }
        if len > data_max {
            return Err(Error::DataLimitExceeded);
        }
    }

    Ok(())
}

pub fn program_entry() -> i8 {
    match run() {
        Ok(()) => 0,
        Err(err) => err as i8,
    }
}
