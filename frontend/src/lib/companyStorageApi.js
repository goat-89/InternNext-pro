import { supabase } from './supabase';

const COMPANY_ASSETS_BUCKET = 'company-assets';

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = {
'image/jpeg': 'jpg',
'image/png': 'png',
'image/webp': 'webp',
};

function createUniqueId() {
if (
typeof crypto !== 'undefined' &&
typeof crypto.randomUUID === 'function'
) {
return crypto.randomUUID();
}

return (
String(Date.now()) +
'-' +
Math.random().toString(36).slice(2)
);
}

function validateImageFile(
file,
maximumSize,
label
) {
if (
!file ||
typeof file !== 'object' ||
typeof file.size !== 'number'
) {
throw new Error(
'Select a valid ' +
String(label).toLowerCase() +
' file.'
);
}

const extension =
ALLOWED_IMAGE_EXTENSIONS[file.type];

if (!extension) {
throw new Error(
String(label) +
' must be a JPG, PNG, or WebP image.'
);
}

if (file.size > maximumSize) {
const maximumMegabytes =
Math.round(
maximumSize /
(1024 * 1024)
);


throw new Error(
  String(label) +
    ' size must not exceed ' +
    String(maximumMegabytes) +
    ' MB.'
);


}

return extension;
}

async function requireEmployerCompany() {
const userResponse =
await supabase.auth.getUser();

const userError =
userResponse.error;

const user =
userResponse.data?.user ?? null;

if (userError) {
throw userError;
}

if (!user) {
throw new Error(
'You must sign in as an employer.'
);
}

const profileResponse =
await supabase
.from('profiles')
.select(
'id, role, account_status'
)
.eq('id', user.id)
.maybeSingle();

if (profileResponse.error) {
throw profileResponse.error;
}

const profile =
profileResponse.data;

if (
!profile ||
profile.role !== 'employer'
) {
throw new Error(
'Employer access is required.'
);
}

if (
profile.account_status ===
'suspended'
) {
throw new Error(
'This employer account is suspended.'
);
}

const companyResponse =
await supabase
.from('companies')
.select(
`           id,
          owner_id,
          name,
          status,
          logo_path,
          cover_path
        `
)
.eq('owner_id', user.id)
.maybeSingle();

if (companyResponse.error) {
throw companyResponse.error;
}

const company =
companyResponse.data;

if (!company) {
throw new Error(
'Complete employer onboarding before uploading company assets.'
);
}

if (
company.status ===
'suspended'
) {
throw new Error(
'This company is suspended.'
);
}

return {
user,
company,
};
}

async function removeObjectQuietly(
assetPath
) {
if (!assetPath) {
return;
}

try {
const response =
await supabase.storage
.from(
COMPANY_ASSETS_BUCKET
)
.remove([assetPath]);


if (response.error) {
  console.error(
    'Unable to remove company asset:',
    response.error
  );
}


} catch (error) {
console.error(
'Unable to remove company asset:',
error
);
}
}

export function getCompanyAssetUrl(
assetPath
) {
if (!assetPath) {
return null;
}

const response =
supabase.storage
.from(
COMPANY_ASSETS_BUCKET
)
.getPublicUrl(assetPath);

return (
response.data?.publicUrl ??
null
);
}

export async function getCompanyStorageState() {
const context =
await requireEmployerCompany();

const company =
context.company;

return {
companyId:
company.id,


companyName:
  company.name,

logoPath:
  company.logo_path ?? null,

logoUrl:
  getCompanyAssetUrl(
    company.logo_path
  ),

coverPath:
  company.cover_path ?? null,

coverUrl:
  getCompanyAssetUrl(
    company.cover_path
  ),


};
}

async function persistCompanyAssetPath(
rpcName,
assetPath
) {
const response =
await supabase.rpc(
rpcName,
{
asset_path: assetPath,
}
);

if (response.error) {
throw response.error;
}
}

async function uploadCompanyAsset({
file,
kind,
maximumSize,
label,
currentPath,
rpcName,
}) {
const extension =
validateImageFile(
file,
maximumSize,
label
);

const context =
await requireEmployerCompany();

const userId =
context.user.id;

const previousPath =
currentPath(context.company) ??
null;

const fileName =
kind +
'-' +
createUniqueId() +
'.' +
extension;

const newPath =
userId +
'/' +
fileName;

const uploadResponse =
await supabase.storage
.from(
COMPANY_ASSETS_BUCKET
)
.upload(
newPath,
file,
{
cacheControl: '3600',
contentType: file.type,
upsert: false,
}
);

if (uploadResponse.error) {
throw uploadResponse.error;
}

try {
await persistCompanyAssetPath(
rpcName,
newPath
);
} catch (error) {
await removeObjectQuietly(
newPath
);


throw error;


}

if (
previousPath &&
previousPath !== newPath
) {
await removeObjectQuietly(
previousPath
);
}

return {
path: newPath,


publicUrl:
  getCompanyAssetUrl(
    newPath
  ),


};
}

export async function uploadCompanyLogo(
file
) {
return uploadCompanyAsset({
file,


kind: 'logo',

maximumSize:
  MAX_LOGO_SIZE,

label:
  'Company logo',

currentPath:
  function currentLogoPath(
    company
  ) {
    return company.logo_path;
  },

rpcName:
  'set_company_logo_path',


});
}

export async function uploadCompanyCover(
file
) {
return uploadCompanyAsset({
file,


kind: 'cover',

maximumSize:
  MAX_COVER_SIZE,

label:
  'Company cover image',

currentPath:
  function currentCoverPath(
    company
  ) {
    return company.cover_path;
  },

rpcName:
  'set_company_cover_path',


});
}

async function deleteCompanyAsset({
currentPath,
rpcName,
}) {
const context =
await requireEmployerCompany();

const previousPath =
currentPath(context.company) ??
null;

await persistCompanyAssetPath(
rpcName,
null
);

await removeObjectQuietly(
previousPath
);

return true;
}

export async function deleteCompanyLogo() {
return deleteCompanyAsset({
currentPath:
function currentLogoPath(
company
) {
return company.logo_path;
},


rpcName:
  'set_company_logo_path',


});
}

export async function deleteCompanyCover() {
return deleteCompanyAsset({
currentPath:
function currentCoverPath(
company
) {
return company.cover_path;
},


rpcName:
  'set_company_cover_path',


});
}
