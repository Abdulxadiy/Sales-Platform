export function showOwnerInvitationResult(toast, tenantName, email, status, action = 'create') {
  const prefix = action === 'create'
    ? `"${tenantName}" do‘koni yaratildi. `
    : action === 'change_owner'
      ? `"${tenantName}" do‘konining egasi almashtirildi. `
      : '';

  if (status === 'sent') {
    toast.success(`${prefix}Parol havolasi ${email} manziliga jo‘natildi. Spam papkasini ham tekshiring.`);
  } else if (status === 'cooldown') {
    toast.warning(`${prefix}Havola yaqinda so‘ralgan. Bir daqiqadan keyin Do‘konlar sahifasidan qayta yuboring.`, 8000);
  } else if (status === 'missing_email') {
    toast.warning(`${prefix}Egaga email biriktirilmagan. Manzilni tekshiring va havolani qayta yuboring.`, 8000);
  } else {
    toast.warning(`${prefix}Havola yuborilmadi yoki yuborilganini tasdiqlab bo‘lmadi. Do‘konlar sahifasidan qayta yuboring.`, 8000);
  }
}
